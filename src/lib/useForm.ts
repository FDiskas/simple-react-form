import * as React from 'react';

/**
 * Union type of all possible form field value types
 */
export type FormFieldValue = string | number | boolean | string[] | number[] | File | FileList | null | undefined;

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
export type FormInputEvent = React.ChangeEvent<FormInputElement> | FormFieldValue;

/**
 * Options for configuring the useForm hook behavior
 */
export interface UseFormOptions<T extends Record<string, FormFieldValue>> {
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
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  /** Creates props object for form fields including event handlers */
  register: <K extends keyof T>(
    name: K,
  ) => {
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
 * @template T - Type for form values object
 * @param options - Configuration options for the form
 * @returns Form state and helper methods for managing the form
 */
export function useForm<TValues>({
  defaultValues,
  validator,
  controlled = false,
  debug = false,
}: {
  defaultValues?: Partial<TValues>;
  validator?: (values: TValues) => Partial<Record<keyof TValues, string>>;
  controlled?: boolean;
  debug?: boolean;
}): UseFormReturn<TValues> {
  type InferredT = TValues;

  const { defaultValues: initialDefaultValues = {} as Partial<InferredT> } = { defaultValues };

  // Create refs and state for form state management
  const formRef = React.useRef<Partial<InferredT>>({} as Partial<InferredT>);
  const defaultValuesRef = React.useRef(initialDefaultValues);

  // Track which fields have been touched by the user
  const registeredFieldsRef = React.useRef<Set<keyof InferredT>>(new Set());
  // Track which fields have been modified by the user (including emptying a field)
  const modifiedFieldsRef = React.useRef<Set<keyof InferredT>>(new Set());

  const [values, setValues] = React.useState<Partial<InferredT>>({} as Partial<InferredT>);
  const [errors, setErrors] = React.useState<Partial<Record<keyof InferredT, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof InferredT, boolean>>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  /**
   * Gets the current form values merged with defaults for unregistered fields
   */
  const getCurrentValues = React.useCallback((): InferredT => {
    // First, get the current form values (from state or ref)
    const currentFormValues = controlled ? values : formRef.current;

    // Start with a fresh object
    const result = {} as Record<keyof InferredT, unknown>;

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
      if (
        Object.prototype.hasOwnProperty.call(currentFormValues, key) &&
        !modifiedFieldsRef.current.has(key as keyof InferredT)
      ) {
        const typedKey = key as keyof InferredT;
        result[typedKey] = currentFormValues[typedKey];
      }
    }

    return result as InferredT;
  }, [controlled, values]);

  const debugFormValues = React.useCallback(
    (label: string) => {
      if (!debug) {
        return;
      } // Only log if debug is enabled

      console.group(`Form Debug: ${label}`);
      console.log('Current Values:', getCurrentValues());
      console.log('Modified Fields:', Array.from(modifiedFieldsRef.current));
      console.log('Registered Fields:', Array.from(registeredFieldsRef.current));
      console.log('Raw Form Values:', controlled ? values : formRef.current);
      console.log('Default Values:', defaultValuesRef.current);
      console.groupEnd();
    },
    [getCurrentValues, controlled, values, debug],
  );

  /**
   * Validates form values using the provided validator function
   */
  const validate = React.useCallback(async (): Promise<boolean> => {
    if (!validator) {
      return true;
    }

    const currentValues = getCurrentValues();
    const validationErrors = await validator(currentValues as TValues);
    const hasErrors = Object.keys(validationErrors).length > 0;

    setErrors(validationErrors as Partial<Record<keyof InferredT, string>>);

    return !hasErrors;
  }, [getCurrentValues, validator]);

  /**
   * Updates form values based on input changes
   */
  const updateFormValue = React.useCallback(
    <K extends keyof InferredT>(name: K, value: InferredT[K]) => {
      // Mark this field as modified by the user
      modifiedFieldsRef.current.add(name);

      if (controlled) {
        setValues((prev) => ({ ...prev, [name]: value }));
      } else {
        formRef.current = { ...formRef.current, [name]: value };
      }

      setIsDirty(true);
      debugFormValues(`After Update: ${String(name)}`); // Add this line
    },
    [controlled, debugFormValues],
  );

  /**
   * Processes the input change event and extracts the appropriate value
   */
  const handleInputChange = React.useCallback(
    (name: keyof InferredT, e: React.ChangeEvent<HTMLInputElement>) => {
      // Direct value from custom component
      if (e === null || e === undefined || !e.target) {
        updateFormValue(name, e as InferredT[typeof name]);

        return;
      }

      // Always mark field as modified when handleInputChange is called
      // This ensures we track all modifications through React's event system
      modifiedFieldsRef.current.add(name);

      const target = e.currentTarget;
      const inputType = target.type;
      const currentFieldValue = getCurrentValues()[name];
      let newValue: unknown;

      // Handle checkbox
      if (inputType === 'checkbox') {
        // Check if this is a checkbox group (has a default array value)
        const defaultValue = defaultValuesRef.current[name as keyof typeof defaultValuesRef.current];
        const isCheckboxGroup = Array.isArray(defaultValue) || Array.isArray(currentFieldValue);

        if (isCheckboxGroup) {
          // Handle checkbox groups (array of values)
          const { value, checked } = target as HTMLInputElement;

          // Important: We need to get the FULL array of currently checked values
          // This ensures we don't lose existing selections when a new checkbox is clicked
          let currentArray: unknown[] = [];

          // If it exists in current form values, use that
          if (Array.isArray(currentFieldValue)) {
            currentArray = [...currentFieldValue];
          }
          // Otherwise, fall back to default values if available
          else if (Array.isArray(defaultValue)) {
            currentArray = [...defaultValue];
          }

          // Now update our array with the new selection
          if (checked) {
            // Add value if not already in array
            if (!currentArray.includes(value)) {
              currentArray.push(value);
            }
          } else {
            // Remove value from array
            currentArray = currentArray.filter((v) => v !== value);
          }

          newValue = currentArray;
        } else {
          // Regular boolean checkbox
          newValue = (target as HTMLInputElement).checked;
        }
      }
      // Handle radio button
      else if (inputType === 'radio') {
        newValue = target.value;
      }
      // Handle multi-select
      else if (inputType === 'select-multiple' && target instanceof HTMLSelectElement) {
        newValue = Array.from(target.options)
          .filter((option) => option.selected)
          .map((option) => option.value);
      }
      // Handle default inputs (text, select, etc.)
      else {
        newValue = target.value;
      }

      updateFormValue(name, newValue as InferredT[keyof InferredT]);
    },
    [getCurrentValues, updateFormValue],
  );

  /**
   * Handles setup of input elements based on their type
   */
  const setupInputElement = React.useCallback(
    <K extends keyof InferredT>(element: FormInputElement | null, name: K, currentValue: unknown) => {
      if (!element) {
        return;
      }

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
          Array.from(element.options).forEach((option) => {
            option.selected = currentValue.includes(option.value);
          });
        }
        // Handle single select
        else if (element instanceof HTMLSelectElement && currentValue !== undefined) {
          element.value = String(currentValue);
        }
        // Handle checkboxes and radio buttons
        else if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
          if (element.type === 'checkbox' && Array.isArray(currentValue)) {
            element.checked = currentValue.includes(element.value);
          } else if (element.type === 'radio') {
            element.checked = String(currentValue) === String(element.value);
          } else if (element.type === 'checkbox' && typeof currentValue === 'boolean') {
            element.checked = !!currentValue;
          }
        }
      }, 0);
    },
    [],
  );

  /**
   * Registers a form field and returns props for binding to inputs
   */
  const register = React.useCallback(
    <K extends keyof InferredT>(name: K) => {
      const currentValue = getCurrentValues()[name];

      const props = {
        name,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(name, e),
        onBlur: () => {
          setTouched((prev) => ({ ...prev, [name]: true }));
          // Mark as modified on blur as well to catch any direct input
          // that might bypass the onChange handler
          modifiedFieldsRef.current.add(name);
          validate();
        },
        ref: (element: FormInputElement | null) => setupInputElement(element, name, currentValue),
      };

      return props;
    },
    [getCurrentValues, handleInputChange, setupInputElement, validate],
  );

  /**
   * Sets a field value programmatically
   */
  const setValue = React.useCallback(
    <K extends keyof InferredT>(name: K, value: InferredT[K]) => {
      updateFormValue(name, value);
    },
    [updateFormValue],
  );

  /**
   * Resets the form to its default values
   */
  const reset = React.useCallback(() => {
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
    formElements.forEach((element) => {
      const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = input.name;

      // Fix for "defaultValues is possibly undefined"
      if (!name || !defaultValues || !(name in defaultValues)) {
        return;
      }

      const defaultValue = defaultValues[name as keyof typeof defaultValues];

      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (Array.isArray(defaultValue)) {
            // Fix for "Argument of type 'string' is not assignable to parameter of type 'never'"
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
          // Fix for array type checking
          const valueArray = defaultValue as unknown[];
          Array.from(input.options).forEach((option) => {
            option.selected = valueArray.includes(option.value);
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
  const handleSubmit = React.useCallback(
    (onSubmit: (values: InferredT) => void | Promise<void>) => {
      return async (e: React.FormEvent<HTMLFormElement>) => {
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
    },
    [getCurrentValues, validate, debugFormValues],
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
  } as UseFormReturn<InferredT>;
}