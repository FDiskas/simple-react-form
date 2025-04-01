import * as React from 'react';

export type FormFieldValue = string | number | boolean | string[] | number[] | File | FileList | null | undefined;
export type FormValues = Record<string, FormFieldValue>;
export type FormInputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type FormInputEvent = React.ChangeEvent<FormInputElement> | FormFieldValue;

export interface UseFormOptions<T extends FormValues> {
  defaultValues?: Partial<T>;
  validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  controlled?: boolean;
  debug?: boolean;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
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
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  reset: () => void;
  isDirty: boolean;
  isValid: boolean;
}

export function useForm<TValues>({
  defaultValues,
  validator,
  controlled = false,
  debug = false,
}: UseFormOptions<TValues>): UseFormReturn<TValues> {
  const { defaultValues: initialDefaultValues = {} as Partial<TValues> } = { defaultValues };
  const formRef = React.useRef<Partial<TValues>>({} as Partial<TValues>);
  const defaultValuesRef = React.useRef(initialDefaultValues);
  const registeredFieldsRef = React.useRef<Set<keyof TValues>>(new Set());
  const modifiedFieldsRef = React.useRef<Set<keyof TValues>>(new Set());

  const [values, setValues] = React.useState<Partial<TValues>>({} as Partial<TValues>);
  const [errors, setErrors] = React.useState<Partial<Record<keyof TValues, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof TValues, boolean>>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  const getCurrentValues = React.useCallback((): TValues => {
    const currentFormValues = controlled ? values : formRef.current;
    const result = { ...defaultValuesRef.current, ...currentFormValues } as TValues;
    Array.from(modifiedFieldsRef.current).forEach((key) => {
      result[key] = currentFormValues[key];
    });
    return result;
  }, [controlled, values]);

  const debugFormValues = React.useCallback(
    (label: string) => {
      if (debug) {
        console.group(`Form Debug: ${label}`);
        console.log('Current Values:', getCurrentValues());
        console.log('Modified Fields:', Array.from(modifiedFieldsRef.current));
        console.log('Registered Fields:', Array.from(registeredFieldsRef.current));
        console.log('Raw Form Values:', controlled ? values : formRef.current);
        console.log('Default Values:', defaultValuesRef.current);
        console.groupEnd();
      }
    },
    [getCurrentValues, controlled, values, debug],
  );

  const validate = React.useCallback(async (): Promise<boolean> => {
    if (!validator) {
      return true;
    }

    const currentValues = getCurrentValues();
    const validationErrors = await validator(currentValues);
    const hasErrors = Object.keys(validationErrors).length > 0;

    setErrors(validationErrors);

    return !hasErrors;
  }, [getCurrentValues, validator]);

  const updateFormValue = React.useCallback(
    <K extends keyof TValues>(name: K, value: TValues[K]) => {
      modifiedFieldsRef.current.add(name);

      if (controlled) {
        setValues((prev) => ({ ...prev, [name]: value }));
      } else {
        formRef.current = { ...formRef.current, [name]: value };
      }

      setIsDirty(true);
      debugFormValues(`After Update: ${String(name)}`);
    },
    [controlled, debugFormValues],
  );

  const handleInputChange = React.useCallback(
    (name: keyof TValues, e: FormInputEvent) => {
      modifiedFieldsRef.current.add(name);

      let newValue: unknown;

      if (e instanceof Event) {
        const target = e.currentTarget;
        const inputType = target.type;
        const currentFieldValue = getCurrentValues()[name];

        if (inputType === 'checkbox') {
          const defaultValue = defaultValuesRef.current[name];
          const isCheckboxGroup = Array.isArray(defaultValue) || Array.isArray(currentFieldValue);

          if (isCheckboxGroup) {
            const { value, checked } = target as HTMLInputElement;
            let currentArray: unknown[] = [];

            if (Array.isArray(currentFieldValue)) {
              currentArray = [...currentFieldValue];
            } else if (Array.isArray(defaultValue)) {
              currentArray = [...defaultValue];
            }

            if (checked) {
              if (!currentArray.includes(value)) {
                currentArray.push(value);
              }
            } else {
              currentArray = currentArray.filter((v) => v !== value);
            }

            newValue = currentArray;
          } else {
            newValue = (target as HTMLInputElement).checked;
          }
        } else if (inputType === 'radio') {
          newValue = target.value;
        } else if (inputType === 'select-multiple' && target instanceof HTMLSelectElement) {
          newValue = Array.from(target.options)
            .filter((option) => option.selected)
            .map((option) => option.value);
        } else {
          newValue = target.value;
        }
      } else {
        newValue = e;
      }

      updateFormValue(name, newValue as TValues[keyof TValues]);
    },
    [getCurrentValues, updateFormValue],
  );

  const setupInputElement = React.useCallback(
    <K extends keyof TValues>(element: FormInputElement | null, name: K, currentValue: unknown) => {
      if (!element) {
        return;
      }

      registeredFieldsRef.current.add(name);

      if (element instanceof HTMLInputElement) {
        if (element.type !== 'checkbox' && element.type !== 'radio' && element.type !== 'file') {
          element.defaultValue = currentValue !== undefined ? String(currentValue) : '';
        }
      } else {
        element.value = currentValue !== undefined ? String(currentValue) : '';
      }

      setTimeout(() => {
        if (element instanceof HTMLSelectElement && element.multiple && Array.isArray(currentValue)) {
          Array.from(element.options).forEach((option) => {
            option.selected = currentValue.includes(option.value);
          });
        } else if (element instanceof HTMLSelectElement && currentValue !== undefined) {
          element.value = String(currentValue);
        } else if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
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

  const register = React.useCallback(
    <K extends keyof TValues>(name: K) => {
      const currentValue = getCurrentValues()[name];

      return {
        name,
        onChange: (e: FormInputEvent) => handleInputChange(name, e),
        onBlur: () => {
          setTouched((prev) => ({ ...prev, [name]: true }));
          modifiedFieldsRef.current.add(name);
          validate();
        },
        ref: (element: FormInputElement | null) => setupInputElement(element, name, currentValue),
      };
    },
    [getCurrentValues, handleInputChange, setupInputElement, validate],
  );

  const setValue = React.useCallback(
    <K extends keyof TValues>(name: K, value: TValues[K]) => {
      updateFormValue(name, value);
    },
    [updateFormValue],
  );

  const reset = React.useCallback(() => {
    if (controlled) {
      setValues({} as Partial<TValues>);
    } else {
      formRef.current = {} as Partial<TValues>;
    }

    registeredFieldsRef.current.clear();
    modifiedFieldsRef.current.clear();

    const formElements = document.querySelectorAll('form input, form select, form textarea');
    formElements.forEach((element) => {
      const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = input.name;

      if (!name || !defaultValues || !(name in defaultValues)) {
        return;
      }

      const defaultValue = defaultValues[name as keyof typeof defaultValues];

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

    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [controlled, defaultValues]);

  const handleSubmit = React.useCallback(
    (onSubmit: (values: TValues) => void | Promise<void>) => {
      return async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        debugFormValues('Before Submit');

        const isValid = await validate();

        if (isValid) {
          const submissionValues = getCurrentValues();
          debugFormValues('Submit Values');
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
  };
}