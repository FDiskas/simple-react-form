import { useState } from 'react';
import { useForm, FormValues } from '../lib/useForm';

// Define the form shape for profile info
interface ProfileForm extends FormValues {
  firstName: string;
  lastName: string;
  bio: string;
  newsletter: boolean;
  hiddenToken: string; // This field has no input element
}

const profileValidator = (values: ProfileForm) => {
  const errors: Partial<Record<keyof ProfileForm, string>> = {};
  
  if (!values.firstName) {
    errors.firstName = 'First name is required';
  }
  
  if (!values.lastName) {
    errors.lastName = 'Last name is required';
  }
  
  if (values.bio && values.bio.length > 200) {
    errors.bio = 'Bio cannot exceed 200 characters';
  }
  
  return errors;
};

export function UncontrolledForm() {
  const [submittedData, setSubmittedData] = useState<ProfileForm | null>(null);
  
  // Explicitly set controlled to false and use validateOn option
  const { values, errors, handleSubmit, register, reset } = useForm<ProfileForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      bio: '',
      newsletter: false,
      hiddenToken: 'secret-token-12345' // This value should persist
    },
    validator: profileValidator,
    controlled: false, // Explicitly set to false for clarity
  });

  const onSubmit = (data: ProfileForm) => {
    console.log('Uncontrolled form submitted:', data);
    // Notice that hiddenToken will be included here even though it has no input element
    setSubmittedData(data);
  };

  return (
    <div className="uncontrolled-form-demo">
      <h2>Uncontrolled Form Example</h2>
      <p>This form uses refs instead of state for better performance.</p>
      <p>Fields are only validated on submission, not while typing or on blur.</p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input 
            id="firstName" 
            type="text"
            autoComplete="given-name"
            {...register('firstName')} 
          />
          {errors.firstName && <span className="error">{errors.firstName}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input 
            id="lastName" 
            type="text"
            autoComplete="family-name"
            {...register('lastName')} 
          />
          {errors.lastName && <span className="error">{errors.lastName}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea 
            id="bio" 
            {...register('bio')} 
          />
          {errors.bio && <span className="error">{errors.bio}</span>}
        </div>
        
        <div className="form-group checkbox">
          <input 
            id="newsletter" 
            type="checkbox" 
            {...register('newsletter')} 
          />
          <label htmlFor="newsletter">Subscribe to newsletter</label>
        </div>
        
        {/* Note: No input for hiddenToken, but it will still be submitted */}
        
        <div className="form-actions">
          <button type="submit">Submit</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </form>
      
      {submittedData && (
        <div className="form-data">
          <h3>Submitted Data (including hidden values):</h3>
          <pre>{JSON.stringify(submittedData, null, 2)}</pre>
        </div>
      )}
      
      <div className="current-values">
        <h3>Current Form Values:</h3>
        <pre>{JSON.stringify(values, null, 2)}</pre>
      </div>
    </div>
  );
}
