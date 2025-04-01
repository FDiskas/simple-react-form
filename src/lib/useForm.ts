import { useRef, useState, useCallback, FormEvent, ChangeEvent } from 'react';

export type FormFieldValue = string | number | boolean | string[] | number[] | File | FileList | null | undefined;
export type FormValues = Record<string, FormFieldValue>;
export type FormInputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type FormInputEvent = ChangeEvent<FormInputElement> | FormFieldValue;

export interface UseFormOptions<T extends FormValues> {
  validationMode?: "onBlur" | "onChange" | "onSubmit" | "manual";
  defaultValues?: Partial<T>;
  validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  controlled?: boolean;
  debug?: boolean;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>;
  register: <K extends keyof T>(name: K) => {
    name: K;
    defaultValue?: string;
    onChange: (e: FormInputEvent) => void;
    onBlur: () => void;
    value?: string;
    checked?: boolean;
  };
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  reset: () => void;
  isDirty: boolean;
  isValid: boolean;
}

export function useForm<TValues extends FormValues>({
  defaultValues = {} as Partial<TValues>,
  validator,
  controlled = false,
  debug = false,
}: UseFormOptions<TValues>): UseFormReturn<TValues> {
  const formRef = useRef<Partial<TValues>>({} as Partial<TValues>);
  const defaultValuesRef = useRef(defaultValues);
  const registeredFieldsRef = useRef<Set<keyof TValues>>(new Set());
  const modifiedFieldsRef = useRef<Set<keyof TValues>>(new Set());
  const [values, setValues] = useState<Partial<TValues>>({} as Partial<TValues>);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TValues, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);

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

  const getCurrentValues = useCallback((): TValues => {
    const currentFormValues = controlled ? values : formRef.current;
    const result = {} as Record<keyof TValues, unknown>;
    Object.entries(defaultValuesRef.current).forEach(([key, value]) => {
      result[key as keyof TValues] = value;
    });
    modifiedFieldsRef.current.forEach(key => {
      result[key] = currentFormValues[key];
    });
    Object.entries(currentFormValues).forEach(([key, value]) => {
      if (!modifiedFieldsRef.current.has(key as keyof TValues)) {
        result[key as keyof TValues] = value;
      }
    });
    return result as TValues;
  }, [controlled, values]);

  const validate = useCallback(async (): Promise<boolean> => {
    if (!validator) return true;
    const currentValues = getCurrentValues();
    const validationErrors = await validator(currentValues);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [getCurrentValues, validator]);

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

  const handleCheckboxChange = useCallback(
    (name: keyof TValues, target: HTMLInputElement, currentValue: FormFieldValue) => {
      const { value, checked } = target;
      const defaultValue = defaultValuesRef.current[name];
      const isCheckboxGroup = Array.isArray(defaultValue) || Array.isArray(currentValue);
      if (!isCheckboxGroup) {
        return checked;
      }
      let currentArray: unknown[] = [];
      if (Array.isArray(currentValue)) {
        currentArray = [...currentValue];
      } else if (Array.isArray(defaultValue)) {
        currentArray = [...defaultValue];
      }
      if (checked) {
        if (!currentArray.includes(value)) {
          currentArray.push(value);
        }
      } else {
        currentArray = currentArray.filter(v => v !== value);
      }
      return currentArray;
    },
    []
  );

  const handleMultiSelectChange = useCallback(
    (target: HTMLSelectElement) => {
      return Array.from(target.options)
        .filter(option => option.selected)
        .map(option => option.value);
    },
    []
  );

  const handleInputChange = useCallback(
    (name: keyof TValues, e: FormInputEvent) => {
      if (e === null || e === undefined || !(e as ChangeEvent<FormInputElement>).target) {
        updateFormValue(name, e as TValues[typeof name]);
        return;
      }
      modifiedFieldsRef.current.add(name);
      const target = (e as ChangeEvent<FormInputElement>).currentTarget;
      const inputType = target.type;
      const currentValue = getCurrentValues()[name];
      let newValue: unknown;
      if (inputType === 'checkbox') {
        newValue = handleCheckboxChange(name, target as HTMLInputElement, currentValue);
      } else if (inputType === 'radio') {
        newValue = target.value;
      } else if (inputType === 'select-multiple' && target instanceof HTMLSelectElement) {
        newValue = handleMultiSelectChange(target);
      } else {
        newValue = target.value;
      }
      updateFormValue(name, newValue as TValues[keyof TValues]);
    },
    [getCurrentValues, updateFormValue, handleCheckboxChange, handleMultiSelectChange]
  );

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

  const setupInputElement = useCallback(
    <K extends keyof TValues>(element: FormInputElement | null, name: K, currentValue: unknown) => {
      if (!element) return;
      registeredFieldsRef.current.add(name);
      if (element instanceof HTMLInputElement) {
        const isCheckOrRadio = element.type === 'checkbox' || element.type === 'radio';
        if (!isCheckOrRadio && element.type !== 'file') {
          element.defaultValue = currentValue !== undefined ? String(currentValue) : '';
        }
      } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = currentValue !== undefined ? String(currentValue) : '';
      }
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

  const setValue = useCallback(
    <K extends keyof TValues>(name: K, value: TValues[K]) => {
      updateFormValue(name, value);
    },
    [updateFormValue]
  );

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

  const reset = useCallback(() => {
    if (controlled) {
      setValues({} as Partial<TValues>);
    } else {
      formRef.current = {} as Partial<TValues>;
    }
    registeredFieldsRef.current.clear();
    modifiedFieldsRef.current.clear();
    resetDOMElements();
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [controlled, resetDOMElements]);

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