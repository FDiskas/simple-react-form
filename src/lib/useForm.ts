import { useRef, useState, useCallback, FormEvent } from 'react';

/**
 * Generic type for form values
 */
export type FormValues = Record<string, any>;

/**
 * Options for configuring the useForm hook behavior
 */
export interface UseFormOptions<T extends FormValues> {
  /** Initial values for form fields */
  defaultValues?: Partial<T>;
  /** Function to validate form values, returns error messages by field name */
  validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  /** Whether to use React state (true) or refs (false) for form values */
  controlled?: boolean;
}

/**
 * Return type for the useForm hook
 */
export interface UseFormReturn<T extends FormValues> {
  /** Current form values */
  values: T;
  /** Validation error messages by field name */
  errors: Partial<Record<keyof T, string>>;
  /** Tracks which fields have been interacted with */
  touched: Partial<Record<keyof T, boolean>>;
  /** Creates a submit handler that validates and processes form data */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>;
  /** Creates props object for form fields including event handlers */
  register: <K extends keyof T>(name: K) => {
    name: K;
    defaultValue?: string;
    onChange: (e: any) => void;
    onBlur: () => void;
    value?: string;
    checked?: boolean;
  };
  /** Programmatically updates a field value */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  /** Resets form to default values and clears errors/touched state */
  reset: () => void;
  /** Whether any field values have changed from defaults */
  isDirty: boolean;
  /** Whether the form has no validation errors */
  isValid: boolean;
}

/**
 * Custom hook for managing form state, validation, and submission
 * 
 * @template T - Type for form values object
 * @param options - Configuration options for the form
 * @returns Form state and helper methods for managing the form
 */
export function useForm<T extends FormValues = FormValues>(
  options: UseFormOptions<T> = {}
): UseFormReturn<T extends FormValues ? T : (typeof options.defaultValues extends FormValues ? typeof options.defaultValues : FormValues)> {
  type InferredT = T extends FormValues ? T : (typeof options.defaultValues extends FormValues ? typeof options.defaultValues : FormValues);

  const { defaultValues = {} as Partial<InferredT>, validator, controlled = false } = options;
  
  // Create refs and state for form state management
  const formRef = useRef<Partial<InferredT>>({} as Partial<InferredT>);
  const defaultValuesRef = useRef(defaultValues);
  
  // Track which fields have been touched by the user
  const registeredFieldsRef = useRef<Set<keyof InferredT>>(new Set());
  // Track which fields have been modified by the user (including emptying a field)
  const modifiedFieldsRef = useRef<Set<keyof InferredT>>(new Set());
  
  const [values, setValues] = useState<Partial<InferredT>>({} as Partial<InferredT>);
  const [errors, setErrors] = useState<Partial<Record<keyof InferredT, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof InferredT, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);



  /**
   * Gets the current form values merged with defaults for unregistered fields
   */
  const getCurrentValues = useCallback((): InferredT => {
    // First, get the current form values (from state or ref)
    const currentFormValues = controlled ? values : formRef.current;
    
    // Start with a fresh object
    const result = {} as Record<keyof InferredT, any>;
    
    // Apply all default values first
    for (const key in defaultValuesRef.current) {
      if (Object.prototype.hasOwnProperty.call(defaultValuesRef.current, key)) {
        const typedKey = key as keyof InferredT;
        result[typedKey] = (defaultValuesRef.current as Partial<InferredT>)[typedKey];
      }
    }
    
    // Override with current form values for all modified fields
    // This ensures emptied fields are properly respected even when they have default values
    for (const key of modifiedFieldsRef.current) {
      const typedKey = key as keyof InferredT;
      // Always use current value for modified fields, even if empty
      result[typedKey] = currentFormValues[typedKey];
    }
    
    // Include any other fields in currentFormValues that weren't explicitly modified
    // but were programmatically set (e.g., via setValue)
    for (const key in currentFormValues) {
      if (Object.prototype.hasOwnProperty.call(currentFormValues, key) && 
          !modifiedFieldsRef.current.has(key as keyof InferredT)) {
        const typedKey = key as keyof InferredT;
        result[typedKey] = currentFormValues[typedKey];
      }
    }
    
    return result as InferredT;
  }, [controlled, values]);

  
  const debugFormValues = useCallback((label: string) => {
    console.group(`Form Debug: ${label}`);
    console.log('Current Values:', getCurrentValues());
    console.log('Modified Fields:', Array.from(modifiedFieldsRef.current));
    console.log('Registered Fields:', Array.from(registeredFieldsRef.current));
    console.log('Raw Form Values:', controlled ? values : formRef.current);
    console.log('Default Values:', defaultValuesRef.current);
    console.groupEnd();
  }, [getCurrentValues, controlled, values]);

  
  /**
   * Validates form values using the provided validator function
   */
  const validate = useCallback(async (): Promise<boolean> => {
    if (!validator) return true;
    
    const currentValues = getCurrentValues();
    const validationErrors = await validator(currentValues as T);
    const hasErrors = Object.keys(validationErrors).length > 0;
    
    setErrors(validationErrors as Partial<Record<keyof InferredT, string>>);
    
    return !hasErrors;
  }, [getCurrentValues, validator]);

  /**
   * Updates form values based on input changes
   */
  const updateFormValue = useCallback(<K extends keyof InferredT>(name: K, value: InferredT[K]) => {
    // Mark this field as modified by the user
    modifiedFieldsRef.current.add(name);
    
    if (controlled) {
      setValues(prev => ({ ...prev, [name]: value }));
    } else {
      formRef.current = { ...formRef.current, [name]: value };
    }
    setIsDirty(true);
    debugFormValues(`After Update: ${String(name)}`); // Add this line
  }, [controlled, debugFormValues]);

  /**
   * Processes the input change event and extracts the appropriate value
   */
  const handleInputChange = useCallback((name: keyof InferredT, e: any) => {
    // Direct value from custom component
    if (!e.target) {
      updateFormValue(name, e);
      return;
    }

    // Always mark field as modified when handleInputChange is called
    // This ensures we track all modifications through React's event system
    modifiedFieldsRef.current.add(name);

    const target = e.target;
    const inputType = target.type;
    const currentFieldValue = getCurrentValues()[name];
    let newValue;
    
    // Handle checkbox
    if (inputType === 'checkbox') {
      if (Array.isArray(currentFieldValue)) {
        // Handle checkbox groups (array of values)
        const { value, checked } = target;
        newValue = checked 
          ? [...currentFieldValue, value]
          : currentFieldValue.filter((v: any) => v !== value);
      } else {
        // Regular boolean checkbox
        newValue = target.checked;
      }
    }
    // Handle radio button
    else if (inputType === 'radio') {
      newValue = target.value;
    }
    // Handle multi-select
    else if (inputType === 'select-multiple') {
      newValue = Array.from(target.options as HTMLCollectionOf<HTMLOptionElement>)
        .filter(option => option.selected)
        .map(option => option.value);
    }
    // Handle default inputs (text, select, etc.)
    else {
      newValue = target.value;
    }
    
    updateFormValue(name, newValue);
  }, [getCurrentValues, updateFormValue]);

  /**
   * Handles setup of input elements based on their type
   */
  const setupInputElement = useCallback(<K extends keyof InferredT>(
    element: HTMLElement, 
    name: K, 
    currentValue: any
  ) => {
    if (!element) return;

    // Mark this field as registered (visible in the form)
    registeredFieldsRef.current.add(name);

    // Set initial value for non-radio/checkbox inputs
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        // Handle setup in the timeout below
      } else if (element.type !== 'file') {
        // Don't set value for file inputs (browser security)
        element.defaultValue = currentValue !== undefined ? String(currentValue) : '';
      }
    } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.value = currentValue !== undefined ? String(currentValue) : '';
    }

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      // Handle select-multiple
      if (element instanceof HTMLSelectElement && element.multiple && Array.isArray(currentValue)) {
        Array.from(element.options).forEach(option => {
          option.selected = currentValue.includes(option.value);
        });
      }
      // Handle single select
      else if (element instanceof HTMLSelectElement && currentValue !== undefined) {
        element.value = String(currentValue);
      }
      // Handle checkboxes and radio buttons
      else if (element instanceof HTMLInputElement && 
              (element.type === 'checkbox' || element.type === 'radio')) {
        if (element.type === 'checkbox' && Array.isArray(currentValue)) {
          element.checked = currentValue.includes(element.value);
        } else if (element.type === 'radio') {
          element.checked = String(currentValue) === String(element.value);
        } else if (element.type === 'checkbox' && typeof currentValue === 'boolean') {
          element.checked = !!currentValue;
        }
      }
    }, 0);
  }, []);

  /**
   * Registers a form field and returns props for binding to inputs
   */
  const register = useCallback(<K extends keyof InferredT>(name: K) => {
    const currentValue = getCurrentValues()[name];
    
    const props = {
      name,
      onChange: (e: any) => handleInputChange(name, e),
      onBlur: () => {
        setTouched(prev => ({ ...prev, [name]: true }));
        // Mark as modified on blur as well to catch any direct input 
        // that might bypass the onChange handler
        modifiedFieldsRef.current.add(name);
        validate();
      },
      ref: (element: any) => setupInputElement(element, name, currentValue)
    };

    return props;
  }, [getCurrentValues, handleInputChange, setupInputElement, validate]);

  /**
   * Sets a field value programmatically
   */
  const setValue = useCallback(<K extends keyof InferredT>(name: K, value: InferredT[K]) => {
    updateFormValue(name, value);
  }, [updateFormValue]);

  /**
   * Resets the form to its default values
   */
  const reset = useCallback(() => {
    // Clear the form values completely, so they'll revert to defaults
    if (controlled) {
      setValues({} as Partial<InferredT>);
    } else {
      formRef.current = {} as Partial<InferredT>;
    }
    
    // Clear both sets of tracked fields
    registeredFieldsRef.current.clear();
    modifiedFieldsRef.current.clear();
    
    // Reset DOM elements
    const formElements = document.querySelectorAll('form input, form select, form textarea');
    formElements.forEach(element => {
      const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = input.name;
      
      if (!name || !(name in defaultValues)) return;
      const defaultValue = defaultValues[name as keyof typeof defaultValues];
      
      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (Array.isArray(defaultValue)) {
            input.checked = defaultValue.includes(input.value);
          } else if (typeof defaultValue === 'boolean') {
            input.checked = defaultValue;
          } else if (input.type === 'radio') {
            input.checked = input.value === String(defaultValue);
          }
        } else if (input.type !== 'file') {
          input.value = defaultValue?.toString() || '';
        }
      } else if (input instanceof HTMLSelectElement) {
        if (input.multiple && Array.isArray(defaultValue)) {
          Array.from(input.options).forEach(option => {
            option.selected = defaultValue.includes(option.value);
          });
        } else {
          input.value = defaultValue?.toString() || '';
        }
      } else {
        input.value = defaultValue?.toString() || '';
      }
    });
    
    // Reset state
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [controlled, defaultValues]);


  /**
   * Creates a submit handler that validates and processes form data
   */
  const handleSubmit = useCallback((onSubmit: (values: InferredT) => void | Promise<void>) => {
    return async (e: FormEvent) => {
      e.preventDefault();
      debugFormValues('Before Submit'); // Add this line
      
      const isValid = await validate();
      if (isValid) {
        // Get values respecting modified fields
        const submissionValues = getCurrentValues();
        debugFormValues('Submit Values'); // Add this line
        await onSubmit(submissionValues);
      }
    };
  }, [getCurrentValues, validate, debugFormValues]);

  return {
    values: getCurrentValues(),
    errors,
    touched,
    handleSubmit,
    register,
    setValue,
    reset,
    isDirty,
    isValid: Object.keys(errors).length === 0
  } as UseFormReturn<InferredT>;
}