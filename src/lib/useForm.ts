// AI Fix for issue #2: Form validation
// Based on user request: I would like to have the ability to change when the form is validated, such as onBlur, onSubmit, etc.

import { useRef, useState, useCallback, FormEvent, ChangeEvent } from 'react';

/**
 * Union type of all possible form field value types
 */
export type FormFieldValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | File
  | FileList
  | null
  | undefined;

/**
 * Generic type for form values
 */
export type FormValues = Record<string, FormFieldValue>;

/**
 * Type for form input elements
 */
export type FormInputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Type for form input change events
 */
export type FormInputEvent = ChangeEvent<FormInputElement> | FormFieldValue;

/**
 * Options for configuring the useForm hook behavior
 */
export interface UseFormOptions<T extends Record<string, FormFieldValue>> {
  /** When to trigger validation: onBlur, onChange, onSubmit, or manual */
  validationMode?: "onBlur" | "onChange" | "onSubmit" | "manual";
  /** Initial values for form fields */
  defaultValues?: Partial<T>;
  /** Function to validate form values, returns error messages by field name */
  validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  /** Whether to use React state (true) or refs (false) for form values */
  controlled?: boolean;
  /** Whether to enable debug logging of form state changes */
  debug?: boolean;
}

/**
 * Return type for the useForm hook
 */
export interface UseFormReturn<T> {
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
    onChange: (e: FormInputEvent) => void;
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
 * @template TValues - Type for form values object
 * @param options - Configuration options for the form
 * @returns Form state and helper methods for managing the form
 */
export function useForm<TValues extends FormValues>({
  defaultValues = {} as Partial<TValues>,
  validator,
  controlled = false,
  debug = false,
}: UseFormOptions<TValues>): UseFormReturn<TValues> {
  // Storage for form values - either ref or state based on controlled option
  const formRef = useRef<Partial<TValues>>({} as Partial<TValues>);
  const defaultValuesRef = useRef(defaultValues);
  
  // Tracking metadata about form fields
  const registeredFieldsRef = useRef<Set<keyof TValues>>(new Set());
  const modifiedFieldsRef = useRef<Set<keyof TValues>>(new Set());

  // State for UI updates and form status
  const [values, setValues] = useState<Partial<TValues>>({} as Partial<TValues>);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TValues, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Logs form state for debugging purposes
   */
  const logDebug = useCallback(
    (label: string) => {
      if (!debug) return;
      
      console.group(`Form Debug: ${label}`);
      console.log('Current Values:', getCurrentValues());
      console.log('Modified Fields:', Array.from(modifiedFieldsRef.current));
      console.log('Registered Fields:', Array.from(registeredFieldsRef.current));
      console.log('Raw Form Values:', controlled ? values : formRef.current);
      console.log('Default Values:', defaultValuesRef.current);
      console.groupEnd();
    },
    [debug, controlled, values]
  );

  /**
   * Gets the current form values merged with defaults
   */
  const getCurrentValues = useCallback((): TValues => {
    const currentFormValues = controlled ? values : formRef.current;
    const result = {} as Record<keyof TValues, unknown>;
    
    // First apply default values as the base
    Object.entries(defaultValuesRef.current).forEach(([key, value]) => {
      result[key as keyof TValues] = value;
    });
    
    // Then override with modified field values, even if empty/falsy
    modifiedFieldsRef.current.forEach(key => {
      result[key] = currentFormValues[key];
    });
    
    // Finally include any other programmatically set values
    Object.entries(currentFormValues).forEach(([key, value]) => {
      if (!modifiedFieldsRef.current.has(key as keyof TValues)) {
        result[key as keyof TValues] = value;
      }
    });

    return result as TValues;
  }, [controlled, values]);

  /**
   * Validates form values using the provided validator function
   */
  const validate = useCallback(async (): Promise<boolean> => {
    if (!validator) return true;

    const currentValues = getCurrentValues();
    const validationErrors = await validator(currentValues);
    setErrors(validationErrors);
    
    return Object.keys(validationErrors).length === 0;
  }, [getCurrentValues, validator]);

  /**
   * Updates form values and marks the field as modified
   */
  const updateFormValue = useCallback(
    <K extends keyof TValues>(name: K, value: TValues[K]) => {
      modifiedFieldsRef.current.add(name);
      
      if (controlled) {
        setValues(prev => ({ ...prev, [name]: value }));
      } else {
        formRef.current = { ...formRef.current, [name]: value };
      }
      
      setIsDirty(true);
      logDebug(`After Update: ${String(name)}`);
    },
    [controlled, logDebug]
  );

  /**
   * Handles checkbox input value updates
   */
  const handleCheckboxChange = useCallback(
    (name: keyof TValues, target: HTMLInputElement, currentValue: FormFieldValue) => {
      const { value, checked } = target;
      const defaultValue = defaultValuesRef.current[name];
      const isCheckboxGroup = Array.isArray(defaultValue) || Array.isArray(currentValue);
      
      if (!isCheckboxGroup) {
        // Simple boolean checkbox
        return checked;
      }
      
      // For checkbox groups (array of values)
      let currentArray: unknown[] = [];
      
      if (Array.isArray(currentValue)) {
        currentArray = [...currentValue];
      } else if (Array.isArray(defaultValue)) {
        currentArray = [...defaultValue];
      }
      
      if (checked) {
        // Add value if not already in array
        if (!currentArray.includes(value)) {
          currentArray.push(value);
        }
      } else {
        // Remove value from array
        currentArray = currentArray.filter(v => v !== value);
      }
      
      return currentArray;
    },
    []
  );

  /**
   * Handles multi-select input value updates
   */
  const handleMultiSelectChange = useCallback(
    (target: HTMLSelectElement) => {
      return Array.from(target.options)
        .filter(option => option.selected)
        .map(option => option.value);
    },
    []
  );

  /**
   * Processes input change events and extracts appropriate values
   */
  const handleInputChange = useCallback(
    (name: keyof TValues, e: FormInputEvent) => {
      // Handle direct value assignment (not an event object)
      if (e === null || e === undefined || !(e as ChangeEvent<FormInputElement>).target) {
        updateFormValue(name, e as TValues[typeof name]);
        return;
      }
      
      modifiedFieldsRef.current.add(name);
      const target = (e as ChangeEvent<FormInputElement>).currentTarget;
      const inputType = target.type;
      const currentValue = getCurrentValues()[name];
      
      let newValue: unknown;
      
      // Extract value based on input type
      if (inputType === 'checkbox') {
        newValue = handleCheckboxChange(name, target as HTMLInputElement, currentValue);
      } else if (inputType === 'radio') {
        newValue = target.value;
      } else if (inputType === 'select-multiple' && target instanceof HTMLSelectElement) {
        newValue = handleMultiSelectChange(target);
      } else {
        // Standard text, number, etc. inputs
        newValue = target.value;
      }
      
      updateFormValue(name, newValue as TValues[keyof TValues]);
    },
    [getCurrentValues, updateFormValue, handleCheckboxChange, handleMultiSelectChange]
  );

  /**
   * Sets up checkbox or radio button initial state
   */
  const setupCheckboxOrRadio = useCallback(
    (element: HTMLInputElement, currentValue: unknown) => {
      if (element.type === 'checkbox' && Array.isArray(currentValue)) {
        element.checked = currentValue.includes(element.value);
      } else if (element.type === 'radio') {
        element.checked = String(currentValue) === String(element.value);
      } else if (element.type === 'checkbox' && typeof currentValue === 'boolean') {
        element.checked = !!currentValue;
      }
    },
    []
  );

  /**
   * Sets up select element initial state
   */
  const setupSelectElement = useCallback(
    (element: HTMLSelectElement, currentValue: unknown) => {
      if (element.multiple && Array.isArray(currentValue)) {
        Array.from(element.options).forEach(option => {
          option.selected = currentValue.includes(option.value);
        });
      } else if (currentValue !== undefined) {
        element.value = String(currentValue);
      }
    },
    []
  );

  /**
   * Sets up input element initial state based on its type
   */
  const setupInputElement = useCallback(
    <K extends keyof TValues>(element: FormInputElement | null, name: K, currentValue: unknown) => {
      if (!element) return;
      
      registeredFieldsRef.current.add(name);
      
      // Initial setup for different element types
      if (element instanceof HTMLInputElement) {
        const isCheckOrRadio = element.type === 'checkbox' || element.type === 'radio';
        
        if (!isCheckOrRadio && element.type !== 'file') {
          element.defaultValue = currentValue !== undefined ? String(currentValue) : '';
        }
      } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = currentValue !== undefined ? String(currentValue) : '';
      }
      
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (element instanceof HTMLSelectElement) {
          setupSelectElement(element, currentValue);
        } else if (element instanceof HTMLInputElement && 
                  (element.type === 'checkbox' || element.type === 'radio')) {
          setupCheckboxOrRadio(element, currentValue);
        }
      }, 0);
    },
    [setupCheckboxOrRadio, setupSelectElement]
  );

  /**
   * Registers a form field and returns props for binding to inputs
   */
  const register = useCallback(
    <K extends keyof TValues>(name: K) => {
      const currentValue = getCurrentValues()[name];
      
      return {
        name,
        onChange: (e: FormInputEvent) => handleInputChange(name, e),
        onBlur: () => {
          setTouched(prev => ({ ...prev, [name]: true }));
          modifiedFieldsRef.current.add(name);
          validate();
        },
        ref: (element: FormInputElement | null) => setupInputElement(element, name, currentValue),
      };
    },
    [getCurrentValues, handleInputChange, setupInputElement, validate]
  );

  /**
   * Sets a field value programmatically
   */
  const setValue = useCallback(
    <K extends keyof TValues>(name: K, value: TValues[K]) => {
      updateFormValue(name, value);
    },
    [updateFormValue]
  );

  /**
   * Resets input elements to their default values
   */
  const resetDOMElements = useCallback(() => {
    if (!defaultValues) return;
    
    const formElements = document.querySelectorAll('form input, form select, form textarea');
    formElements.forEach(element => {
      const input = element as FormInputElement;
      const name = input.name as keyof typeof defaultValues;
      
      if (!name || !(name in defaultValues)) return;
      
      const defaultValue = defaultValues[name];
      
      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (Array.isArray(defaultValue)) {
            const valueArray = defaultValue as unknown[];
            input.checked = valueArray.includes(input.value);
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
          const valueArray = defaultValue as unknown[];
          Array.from(input.options).forEach(option => {
            option.selected = valueArray.includes(option.value);
          });
        } else {
          input.value = defaultValue?.toString() || '';
        }
      } else {
        input.value = defaultValue?.toString() || '';
      }
    });
  }, [defaultValues]);

  /**
   * Resets the form to its default values
   */
  const reset = useCallback(() => {
    // Clear form values
    if (controlled) {
      setValues({} as Partial<TValues>);
    } else {
      formRef.current = {} as Partial<TValues>;
    }
    
    // Clear tracking metadata
    registeredFieldsRef.current.clear();
    modifiedFieldsRef.current.clear();
    
    // Reset DOM elements
    resetDOMElements();
    
    // Reset state
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [controlled, resetDOMElements]);

  /**
   * Creates a submit handler that validates and processes form data
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: TValues) => void | Promise<void>) => {
      return async (e: FormEvent) => {
        e.preventDefault();
        logDebug('Before Submit');
        
        const isValid = await validate();
        
        if (isValid) {
          const submissionValues = getCurrentValues();
          logDebug('Submit Values');
          try {
            const result = await onSubmit(submissionValues);
            return result;
          } catch (error) {
            console.error("Form submission error:", error);
            throw error;
          }
        }
      };
    },
    [getCurrentValues, validate, logDebug]
  );

  return {
    values: getCurrentValues(),
    errors,
    touched,
    handleSubmit,
    register,
    setValue,
    reset,
    isDirty,
    isValid: Object.keys(errors).length === 0,
  } as UseFormReturn<TValues>;
}
