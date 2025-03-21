# SimpleForm Documentation

This document provides detailed documentation for using SimpleForm in your React applications.

## AI-Generated Project

SimpleForm is a unique project that was entirely generated by artificial intelligence. Every line of code, including the implementation, documentation, and examples was created using AI. The main hook was created with the following prompt:

```
Create a React hook called 'useForm' that manages form state, validation, and submission. The hook should provide a complete form management solution with these features:
1. Type support for form values using TypeScript generics
2. Support for both controlled and uncontrolled form components
3. Field registration system that handles different input types (text, checkbox, radio, select, etc.)
4. Validation with error tracking
5. Field touched state tracking
6. Dirty state detection
7. Form reset functionality
8. Programmatic value setting

The hook should accept these configuration options:
- defaultValues: Initial values for form fields
- validator: Function that validates form values and returns error messages
- controlled: Boolean flag to use React state (true) or refs (false)

The hook should return:
- values: Current form values
- errors: Validation error messages
- touched: Tracking of interacted fields
- handleSubmit: Submit handler generator that validates before submission
- register: Function to create props for form fields
- setValue: Method to programmatically update field values
- reset: Function to reset the form to default values
- isDirty: Boolean indicating if form values differ from defaults
- isValid: Boolean indicating if form has no validation errors

Make the hook handle all common input types correctly, including:
- Text inputs and textareas
- Checkboxes (both single boolean and groups)
- Radio buttons (both single and multiple)
- Select elements (both single and multiple)
- Custom components that don't use standard events

Include thorough TypeScript types for all inputs and outputs.
```

The AI successfully implemented all requirements while maintaining best practices, optimizing performance, and ensuring developer-friendly ergonomics.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [API Reference](#api-reference)
3. [TypeScript Integration](#typescript-integration)
4. [Performance Considerations](#performance-considerations)
5. [Advanced Usage Patterns](#advanced-usage-patterns)
6. [Troubleshooting](#troubleshooting)

## Core Concepts

SimpleForm is built around several key concepts that help you work with forms in React:

### Form Values

Form values are stored in a single object, with each field represented by a key-value pair. This makes it easy to work with the form data and submit it to APIs.

### Field Registration

Fields are registered with the form via the `register` method, which creates the necessary props for form elements. This connects the input to the form's state management system.

### Validation

Validation is handled through a function that takes the current form values and returns an object containing error messages for invalid fields.

### Controlled vs. Uncontrolled

SimpleForm supports both controlled (React state) and uncontrolled (ref-based) form management. This gives you flexibility in how you handle form state.

### Modified Field Tracking

SimpleForm tracks which fields have been modified by the user, ensuring that empty fields are correctly handled during form submission.

## API Reference

### `useForm<T>(options?: UseFormOptions<T>): UseFormReturn<T>`

The main hook for creating a form.

#### Options

```typescript
interface UseFormOptions<T extends FormValues> {
  /** Initial values for form fields */
  defaultValues?: Partial<T>;
  /** Function to validate form values, returns error messages by field name */
  validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  /** Whether to use React state (true) or refs (false) for form values */
  controlled?: boolean;
}
```

#### Return Value

```typescript
interface UseFormReturn<T extends FormValues> {
  /** Current form values */
  values: T;
  /** Validation error messages by field name */
  errors: Partial<Record<keyof T, string>>;
  /** Tracks which fields have been interacted with */
  touched: Partial<Record<keyof T, boolean>>;
  /** Creates a submit handler that validates and processes form data */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>;
  /** Creates props object for form fields including event handlers */
  register: <K extends keyof T>(name: K) => { /* props for form field */ };
  /** Programmatically updates a field value */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  /** Resets form to default values and clears errors/touched state */
  reset: () => void;
  /** Whether any field values have changed from defaults */
  isDirty: boolean;
  /** Whether the form has no validation errors */
  isValid: boolean;
}
```

### Methods in Detail

#### `register(name)`

Creates props for a form field, including onChange, onBlur, and ref handlers.

```jsx
<input {...register('email')} />
```

#### `handleSubmit(onSubmit)`

Creates a submit handler that validates the form and calls your submission function if valid.

```jsx
<form onSubmit={handleSubmit((values) => saveUser(values))}>
```

#### `setValue(name, value)`

Programmatically updates a form field value. Useful for integrating with third-party components.

```jsx
setValue('birthdate', new Date('1990-01-01'));
```

#### `reset()`

Resets the form to its initial state, clearing all values, errors, and touched state.

```jsx
<button type="button" onClick={() => reset()}>Reset Form</button>
```

## TypeScript Integration

SimpleForm is built with TypeScript and provides excellent type inference.

```typescript
// Define your form values type
type ProfileFormValues = {
  name: string;
  email: string;
  age: number;
  bio?: string;
};

// Use it with useForm
const form = useForm<ProfileFormValues>({
  defaultValues: {
    name: '',
    email: '',
    age: 0
  }
});

// Now all methods are type-safe
form.register('name'); // OK
form.register('username'); // Type error: 'username' is not in ProfileFormValues
```

## Performance Considerations

### Controlled vs. Uncontrolled Mode

- **Controlled** mode uses React state to manage form values, which is more suitable for forms with fewer fields where you need to react to every change.
- **Uncontrolled** mode uses refs to manage form values, which is more performant for large forms since it doesn't trigger re-renders on every keystroke.

```jsx
// Performant approach for large forms
const form = useForm({
  defaultValues: { /* many fields */ },
  controlled: false
});
```

### Conditional Rendering

When conditionally rendering form fields, make sure the field is properly registered and unregistered as needed:

```jsx
{showAddress && (
  <input {...register('address')} />
)}
```

## Advanced Usage Patterns

### Form Arrays

You can implement dynamic array fields by using indices in field names:

```jsx
function DynamicFieldsForm() {
  const [fieldCount, setFieldCount] = useState(1);
  const { register, handleSubmit, values } = useForm();
  
  return (
    <form onSubmit={handleSubmit(console.log)}>
      {Array.from({ length: fieldCount }).map((_, i) => (
        <input key={i} {...register(`field[${i}]`)} />
      ))}
      
      <button type="button" onClick={() => setFieldCount(c => c + 1)}>
        Add Field
      </button>
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Form Composition

For complex forms, you can split them into sub-components:

```jsx
function MainForm() {
  const form = useForm();
  
  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <PersonalDetailsSection form={form} />
      <AddressSection form={form} />
      <button type="submit">Submit</button>
    </form>
  );
}

function PersonalDetailsSection({ form }) {
  const { register, errors } = form;
  
  return (
    <section>
      <h2>Personal Details</h2>
      <input {...register('name')} />
      {errors.name && <p>{errors.name}</p>}
      {/* more fields */}
    </section>
  );
}
```

### Custom Validation Logic

You can implement complex validation using the validator function:

```jsx
const form = useForm({
  defaultValues: {
    password: '',
    confirmPassword: ''
  },
  validator: (values) => {
    const errors = {};
    
    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }
    
    return errors;
  }
});
```

## Troubleshooting

### Form Values Not Updating

If form values aren't updating when inputs change:

1. Check that you've properly spread the `register()` result into your input
2. Ensure the input has a valid `name` attribute that matches your form structure
3. Try using controlled mode (`controlled: true`) to debug

### Empty Fields Reverting to Default Values

If empty fields are reverting to default values on submission:

This issue has been fixed in SimpleForm by tracking modified fields, even when emptied.
Your empty inputs should now be properly respected during form submission.

### Validation Not Running

If validation isn't running:

1. Check that your validator function is returning an object with error messages
2. Ensure you're using `handleSubmit` to wrap your submit handler
3. Check that field names in error messages match your form fields exactly
