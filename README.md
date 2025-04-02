# SimpleForm

![Version](https://jsr.io/badges/@simple-react/form)
![Size](https://deno.bundlejs.com/badge?scope=unpkg&name=@simple-react/form)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> A lightweight, flexible form management library for React applications

## 🌟 Philosophy

We created SimpleForm because we believe form management in React should be:

1. **Simple** - Form state shouldn't require complex configurations or verbose boilerplate
2. **Performant** - Forms should be fast and efficient, even with many fields
3. **Flexible** - Developers should have fine-grained control when needed
4. **Intuitive** - API should feel natural and reflect how developers think about forms

Most form libraries on the market are either too simple (leaving you to handle complex validation and field management yourself) or too complex (requiring you to learn yet another mental model). SimpleForm strikes the perfect balance - powerful when you need it, simple when you don't.

## 📦 Installation

```bash
# npm
npx jsr add @simple-react/form

# yarn
yarn dlx jsr add @simple-react/form

# pnpm
pnpm dlx jsr add @simple-react/form

# bun
bunx jsr add @simple-react/form
```

## 🚀 Quick Start

```jsx
import { useForm } from '@simple-react/form';

function SignupForm() {
  // Define your form directly with any interface or type - no base types needed
  const { values, errors, register, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validator: (values) => {
      const errors = {};
      if (!values.email) errors.email = 'Email is required';
      if (!values.password) errors.password = 'Password is required';
      return errors;
    }
  });

  const onSubmit = (formData) => {
    console.log('Form submitted:', formData);
    // Submit to your API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" {...register('email')} />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input type="password" id="password" {...register('password')} />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <label>
          <input type="checkbox" {...register('rememberMe')} />
          Remember me
        </label>
      </div>

      <button type="submit">Sign up</button>
    </form>
  );
}
```

## ✨ Features

- **🎯 Type-safe** - Full TypeScript support with inferred types and custom interfaces
- **🔄 Controlled & Uncontrolled inputs** - Works with both approaches
- **🧪 Flexible validation** - Sync or async validation
- **🧩 Form state tracking** - Track values, errors, touched fields, and form status
- **⚡ Performance optimized** - No unnecessary re-renders
- **🔍 Field tracking** - Tracks which fields are modified to handle empty field submissions correctly
- **🧵 Simple API** - Intuitive methods like `register`, `handleSubmit`, and `setValue`
- **🛠️ Debug mode** - Optional debug logging for troubleshooting

## 📖 API Documentation

### `useForm<T>` Hook

```typescript
function useForm<T>(
  options?: {
    defaultValues?: Partial<T>;
    validator?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
    controlled?: boolean;
    debug?: boolean;
  }
): {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>;
  register: <K extends keyof T>(name: K) => { /* props for form field */ };
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  reset: () => void;
  isDirty: boolean;
  isValid: boolean;
}
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `defaultValues` | `Partial<T>` | Initial values for form fields |
| `validator` | `(values: T) => Record<keyof T, string> \| Promise<Record<keyof T, string>>` | Validation function that returns error messages by field name |
| `controlled` | `boolean` | Whether to use React state (`true`) or refs (`false`) for form values |
| `debug` | `boolean` | Enable debug logging to console for troubleshooting |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `values` | `T` | Current form values |
| `errors` | `Partial<Record<keyof T, string>>` | Validation error messages |
| `touched` | `Partial<Record<keyof T, boolean>>` | Which fields have been interacted with |
| `handleSubmit` | `(onSubmit: (values: T) => void \| Promise<void>) => (e: FormEvent) => Promise<void>` | Creates a submit handler |
| `register` | `<K extends keyof T>(name: K) => { name: K; onChange: Function; onBlur: Function; ... }` | Creates props for form fields |
| `setValue` | `<K extends keyof T>(name: K, value: T[K]) => void` | Programmatically update a field value |
| `reset` | `() => void` | Reset form to default values |
| `isDirty` | `boolean` | Whether form values have changed |
| `isValid` | `boolean` | Whether form has no validation errors |

## 📚 Examples

### Basic Form with Validation

```jsx
import { useForm } from '@simple-react/form';

// Define a custom interface directly - no need to extend anything
interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

function ContactForm() {
  const { register, handleSubmit, errors } = useForm<ContactFormValues>({
    defaultValues: {
      name: '',
      email: '',
      message: ''
    },
    validator: (values) => {
      const errors: Partial<Record<keyof ContactFormValues, string>> = {};
      if (!values.name) errors.name = 'Name is required';
      if (!values.email) errors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
        errors.email = 'Email is invalid';
      }
      if (!values.message) errors.message = 'Message is required';
      return errors;
    }
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <div>
        <input placeholder="Name" {...register('name')} />
        {errors.name && <p>{errors.name}</p>}
      </div>
      
      <div>
        <input placeholder="Email" {...register('email')} />
        {errors.email && <p>{errors.email}</p>}
      </div>
      
      <div>
        <textarea placeholder="Message" {...register('message')} />
        {errors.message && <p>{errors.message}</p>}
      </div>
      
      <button type="submit">Send</button>
    </form>
  );
}
```

### Form with Dynamic Fields

```jsx
import { useForm } from '@simple-react/form';
import { useState } from 'react';

function DynamicForm() {
  const [fields, setFields] = useState(['field-0']);
  const { register, handleSubmit, values } = useForm();

  const addField = () => {
    setFields([...fields, `field-${fields.length}`]);
  };

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      {fields.map(fieldId => (
        <div key={fieldId}>
          <input placeholder="Field value" {...register(fieldId)} />
        </div>
      ))}
      
      <button type="button" onClick={addField}>
        Add Field
      </button>
      
      <button type="submit">Submit</button>
      
      <pre>{JSON.stringify(values, null, 2)}</pre>
    </form>
  );
}
```

### Form with Async Validation

```jsx
import { useForm } from '@simple-react/form';

function UsernameForm() {
  const { register, handleSubmit, errors, isValid } = useForm({
    defaultValues: {
      username: ''
    },
    validator: async (values) => {
      const errors = {};
      
      if (!values.username) {
        errors.username = 'Username is required';
      } else if (values.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else {
        // Check if username is available (simulated API call)
        try {
          const response = await fetch(`/api/check-username?username=${values.username}`);
          const data = await response.json();
          if (!data.available) {
            errors.username = 'Username is already taken';
          }
        } catch (error) {
          errors.username = 'Error checking username availability';
        }
      }
      
      return errors;
    }
  });

  return (
    <form onSubmit={handleSubmit(data => console.log('Success:', data))}>
      <div>
        <input placeholder="Username" {...register('username')} />
        {errors.username && <p>{errors.username}</p>}
      </div>
      
      <button type="submit" disabled={!isValid}>
        Register
      </button>
    </form>
  );
}
```

## 🧪 Advanced Usage

### Working with File Inputs

```jsx
import { useForm } from '@simple-react/form';

function FileUploadForm() {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data) => {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', data.fileInput[0]);
    
    // Send to server
    fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="file" {...register('fileInput')} />
      <button type="submit">Upload</button>
    </form>
  );
}
```

### Form with Custom Components

```jsx
import { useForm } from '@simple-react/form';
import DatePicker from 'react-datepicker';

function AppointmentForm() {
  const { register, handleSubmit, setValue, values } = useForm({
    defaultValues: {
      name: '',
      appointmentDate: new Date()
    }
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <div>
        <input placeholder="Your Name" {...register('name')} />
      </div>
      
      <div>
        <DatePicker
          selected={values.appointmentDate}
          onChange={(date) => setValue('appointmentDate', date)}
        />
      </div>
      
      <button type="submit">Book Appointment</button>
    </form>
  );
}
```

## 🔄 Controlled vs. Uncontrolled Mode

SimpleForm supports both controlled and uncontrolled approaches:

```jsx
// Controlled mode (using React state)
const form = useForm({
  defaultValues: { name: '' },
  controlled: true // This is default
});

// Uncontrolled mode (using refs) - more performant for large forms
const form = useForm({
  defaultValues: { name: '' },
  controlled: false
});
```

## 🤔 Why SimpleForm vs. Other Libraries?

| Feature | SimpleForm | Formik | React Hook Form |
|---------|------------|--------|-----------------|
| Bundle Size | ~5kb | ~13kb | ~10kb |
| Validation | Built-in | Yup/manual | Built-in/resolver |
| TypeScript | Full support & direct interfaces | Partial | Full support |
| Empty field handling | Yes | No | Partial |
| Learning curve | Low | Medium | Medium |
| Controlled/Uncontrolled | Both | Controlled | Uncontrolled |
| Debug mode | Yes | Partial | Yes |

## 🤖 AI-Powered Development

SimpleForm was fully generated using artificial intelligence! The entire codebase including the hook implementation, documentation, and examples was created using this prompt:

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

This project demonstrates the power of AI in generating production-quality code that addresses complex requirements while maintaining good practices, performance considerations, and developer ergonomics.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Star us on GitHub! ⭐

If you find SimpleForm useful, please consider giving us a star on GitHub to show your support!!!

