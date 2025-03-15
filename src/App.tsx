import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useForm } from './lib/useForm'
import { UncontrolledForm } from './components/UncontrolledForm'
import { AdvancedForm } from './components/AdvancedForm'

// Define your form shape with TypeScript
interface LoginForm {
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
  crsf: string; // This field has no input element
}

// Simple custom validator function
const validateLoginForm = (values: LoginForm) => {
  const errors: Partial<Record<keyof LoginForm, string>> = {};
  
  if (!values.name) {
    errors.name = 'Name is required';
  }
  
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = 'Email is invalid';
  }
  
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  return errors;
};

function App() {
  const [count, setCount] = useState(0)
  const [formData, setFormData] = useState<LoginForm | null>(null)
  const [activeTab, setActiveTab] = useState<'controlled' | 'uncontrolled' | 'advanced'>('controlled');
  
  // Example of a controlled form
  const { values, errors, touched, handleSubmit, register, reset } = useForm<LoginForm>({
    defaultValues: {
      name: 'My name',
      email: '',
      password: '',
      rememberMe: false,
      crsf: 'bla' // This value should persist
    },
    validator: validateLoginForm,
    controlled: true, // Explicitly set to true for this example
  });

  const onSubmit = (data: LoginForm) => {
    console.log('Form submitted:', data);
    // The data will include crsf field even though it has no input
    setFormData(data);
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Form Library Examples</h1>
      
      {/* Tabs for different form examples */}
      <div className="form-tabs">
        <button 
          className={activeTab === 'controlled' ? 'active' : ''} 
          onClick={() => setActiveTab('controlled')}
        >
          Controlled Form
        </button>
        <button 
          className={activeTab === 'uncontrolled' ? 'active' : ''} 
          onClick={() => setActiveTab('uncontrolled')}
        >
          Uncontrolled Form
        </button>
        <button 
          className={activeTab === 'advanced' ? 'active' : ''} 
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Form
        </button>
      </div>
      
      {/* Controlled Form */}
      {activeTab === 'controlled' && (
        <div className="form-container">
          <h2>Controlled Form Example</h2>
          <p>This form uses React state for all form values.</p>
          <p>Validation only happens on submit.</p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input 
                id="name" 
                type="text"
                autoComplete="name"
                {...register('name')} 
              />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email"
                autoComplete="email" 
                {...register('email')} 
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password"
                autoComplete="current-password" 
                {...register('password')} 
              />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>
            
            <div className="form-group checkbox">
              <input 
                id="rememberMe" 
                type="checkbox" 
                {...register('rememberMe')} 
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            
            {/* No input field for crsf - it's a hidden value */}
            
            <div className="form-actions">
              <button type="submit">Login</button>
              <button type="button" onClick={reset}>Reset</button>
            </div>
          </form>
          
          {formData && (
            <div className="form-data">
              <h3>Submitted Data (including hidden values):</h3>
              <pre>{JSON.stringify(formData, null, 2)}</pre>
            </div>
          )}
          
          <div className="current-values">
            <h3>Current Form Values:</h3>
            <pre>{JSON.stringify(values, null, 2)}</pre>
          </div>
        </div>
      )}
      
      {/* Uncontrolled Form */}
      {activeTab === 'uncontrolled' && (
        <UncontrolledForm />
      )}
      
      {/* Advanced Form */}
      {activeTab === 'advanced' && (
        <AdvancedForm />
      )}
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
