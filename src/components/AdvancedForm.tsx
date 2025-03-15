import { useState } from 'react';
import { useForm } from '../lib/useForm';

// Define a complex form with many different field types
interface AdvancedFormData {
  // Basic inputs
  fullName: string;
  email: string;
  password: string;
  message: string;
  
  // Numbers and range
  age: number;
  satisfaction: number;
  
  // Select and multi-select
  country: string;
  languages: string[];
  
  // Radio buttons
  gender: string;
  
  // Checkboxes
  subscribeNews: boolean;
  interests: string[];
  
  // Date and time
  birthDate: string;
  meetingTime: string;
  
  // Special inputs
  favoriteColor: string;
  profilePicture: FileList | null;
  
  // Hidden field
  sessionId: string;
}

const validateAdvancedForm = (values: AdvancedFormData) => {
  const errors: Partial<Record<keyof AdvancedFormData, string>> = {};
  
  // Basic validation
  if (!values.fullName) {
    errors.fullName = 'Full name is required';
  }
  
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = 'Email is invalid';
  }
  
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  // Number validation
  if (!values.age) {
    errors.age = 'Age is required';
  } else if (values.age < 18) {
    errors.age = 'You must be at least 18 years old';
  }
  
  // Select validation
  if (!values.country) {
    errors.country = 'Please select a country';
  }
  
  // Radio validation
  if (!values.gender) {
    errors.gender = 'Please select a gender';
  }
  
  // Multi-select validation
  if (!values.languages || values.languages.length === 0) {
    errors.languages = 'Please select at least one language';
  }
  
  // Date validation
  if (!values.birthDate) {
    errors.birthDate = 'Birth date is required';
  }
  
  return errors;
};

export function AdvancedForm() {
  const [formData, setFormData] = useState<AdvancedFormData | null>(null);
  
  const { values, errors, handleSubmit, register, setValue, reset, touched } = useForm({
    defaultValues: {
        "fullName": "hfghfghfgh",
        "email": "projektas@gmail.com",
        "password": "dfgdfgdfgdfgdfg",
        "message": "",
        "age": 40,
        "satisfaction": 8,
        "country": "ca",
        "languages": ["fr", "en"],
        "gender": "female",
        "subscribeNews": false,
        "interests": [
          "music",
          "sports"
        ],
        "birthDate": "2025-03-19",
        "meetingTime": "",
        "favoriteColor": "#6366f1",
        "profilePicture": null,
      sessionId: 'adv-form-' + Date.now()
    },
    validator: validateAdvancedForm,
    controlled: true,
  });
  
  const onSubmit = (data: AdvancedFormData) => {
    console.log('Advanced form submitted:', data);
    setFormData(data);
  };
  
  return (
    <div className="advanced-form-demo">
      <h2>Advanced Form Example</h2>
      <p>This form demonstrates many different input types and validation styles.</p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="advanced-form">
        {/* Basic Text Inputs */}
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input 
              id="fullName" 
              type="text" 
              placeholder="John Doe"
              autoComplete="name"
              {...register('fullName')} 
            />
            {errors.fullName && <span className="error">{errors.fullName}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email" 
              type="email"
              placeholder="example@email.com"
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
              placeholder="Your secure password"
              autoComplete="current-password"
              {...register('password')} 
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>
        </div>
        
        {/* Number and Range Inputs */}
        <div className="form-section">
          <h3>Numbers and Sliders</h3>
          
          <div className="form-group">
            <label htmlFor="age">Age</label>
            <input 
              id="age" 
              type="number"
              min="18"
              max="120"
              {...register('age')} 
            />
            {errors.age && <span className="error">{errors.age}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="satisfaction">
              Satisfaction Level: {values.satisfaction}
            </label>
            <input 
              id="satisfaction" 
              type="range"
              min="1"
              max="10"
              {...register('satisfaction')} 
            />
          </div>
        </div>
        
        {/* Selects and Multi-Selects */}
        <div className="form-section">
          <h3>Dropdowns and Selects</h3>
          
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select 
              id="country" 
              {...register('country')} 
            >
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="ca">Canada</option>
              <option value="uk">United Kingdom</option>
              <option value="au">Australia</option>
              <option value="in">India</option>
              <option value="jp">Japan</option>
            </select>
            {errors.country && <span className="error">{errors.country}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="languages">Languages (Multiple)</label>
            <select 
              multiple
              size={4}
              {...register('languages')}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
            {errors.languages && <span className="error">{errors.languages}</span>}
          </div>
        </div>
        
        {/* Radio Buttons */}
        <div className="form-section">
          <h3>Radio Buttons</h3>
          
          <div className="form-group radio-group">
            <label>Gender</label>
            <div className="radio-options">
              <label>
                <input 
                  type="radio" 
                  value="male"
                  {...register('gender')}
                />
                Male
              </label>
              <label>
                <input 
                  type="radio" 
                  value="female" 
                  {...register('gender')}
                />
                Female
              </label>
              <label>
                <input 
                  type="radio" 
                  value="other" 
                  {...register('gender')}
                />
                Other
              </label>
            </div>
            {errors.gender && <span className="error">{errors.gender}</span>}
          </div>
        </div>
        
        {/* Checkboxes */}
        <div className="form-section">
          <h3>Checkboxes</h3>
          
          <div className="form-group checkbox">
            <input 
              id="subscribeNews" 
              type="checkbox" 
              {...register('subscribeNews')} 
            />
            <label htmlFor="subscribeNews">Subscribe to newsletter</label>
          </div>
          
          <div className="form-group checkbox-group">
            <label>Interests</label>
            <div className="checkbox-options">
              <label>
                <input 
                  type="checkbox" 
                  value='technology'
                  {...register('interests')}
                />
                Technology
              </label>
              <label>
                <input 
                  type="checkbox"
                  value='sports'
                  {...register('interests')}
                />
                Sports
              </label>
              <label>
                <input 
                  type="checkbox"
                  value='music'
                  {...register('interests')}
                />
                Music
              </label>
              <label>
                <input 
                  type="checkbox"
                  value='art'
                  {...register('interests')}
                />
                Art
              </label>
            </div>
          </div>
        </div>
        
        {/* Date and Time */}
        <div className="form-section">
          <h3>Date and Time</h3>
          
          <div className="form-group">
            <label htmlFor="birthDate">Birth Date</label>
            <input 
              id="birthDate" 
              type="date" 
              {...register('birthDate')} 
            />
            {errors.birthDate && <span className="error">{errors.birthDate}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="meetingTime">Preferred Meeting Time</label>
            <input 
              id="meetingTime" 
              type="time" 
              {...register('meetingTime')} 
            />
          </div>
        </div>
        
        {/* Special Inputs */}
        <div className="form-section">
          <h3>Special Inputs</h3>
          
          <div className="form-group color-picker">
            <label htmlFor="favoriteColor">Favorite Color</label>
            <input 
              id="favoriteColor" 
              type="color" 
              {...register('favoriteColor')} 
            />
            <span className="color-value">{values.favoriteColor}</span>
          </div>
          
          <div className="form-group file-input">
            <label htmlFor="profilePicture">Profile Picture</label>
            <input 
              id="profilePicture" 
              type="file"
              accept="image/*"
              {...register('profilePicture')}
            />
          </div>
        </div>
        
        {/* Textarea */}
        <div className="form-section">
          <h3>Message</h3>
          
          <div className="form-group">
            <label htmlFor="message">Your Message</label>
            <textarea 
              id="message" 
              placeholder="Type your message here..."
              rows={4}
              {...register('message')} 
            />
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit">Submit Form</button>
          <button type='reset'>Button Type Reset</button>
          <button type="button" onClick={reset}>Reset() Form</button>
        </div>
      </form>
      
      {formData && (
        <div className="form-data">
          <h3>Submitted Data:</h3>
          <pre>{JSON.stringify(formData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
 