/**
 * =============================================================================
 * EMPLOYEE SIGNUP PAGE - JOIN EXISTING ORGANIZATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The signup page for employees to join an existing organization.
 * Employees need the organization name and secret key from their admin.
 * 
 * FLOW:
 * 1. Employee gets organization name and secret key from admin
 * 2. Employee fills in the form with:
 *    - Organization name
 *    - Secret key (ORG-XXXX-XXXX-XXXX-XXXX format)
 *    - Personal details (name, email, password)
 * 3. On success:
 *    - Employee account is created
 *    - Employee is added to the organization with 'employee' role
 *    - Employee can immediately access the platform
 * 
 * SECRET KEY VALIDATION:
 * - Format: ORG-XXXX-XXXX-XXXX-XXXX
 * - Real-time format validation
 * - Server verifies key against hashed version
 * 
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Brain, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Check,
  X,
  Building2,
  Key
} from 'lucide-react';

function EmployeeSignupPage() {
  // Form state
  const [formData, setFormData] = useState({
    organizationName: '',
    secretKey: '',
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: ''
  });

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});
  
  // General error message
  const [error, setError] = useState('');
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Hooks
  const { registerEmployee, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Password strength checker
   */
  const checkPasswordStrength = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const metCount = Object.values(requirements).filter(Boolean).length;
    
    let strength = 'weak';
    if (metCount >= 4) strength = 'strong';
    else if (metCount >= 3) strength = 'medium';

    return { requirements, strength, metCount };
  };

  const passwordStrength = checkPasswordStrength(formData.password);

  /**
   * Format secret key as user types
   * Automatically adds dashes in correct positions
   */
  const formatSecretKey = (value) => {
    // Remove all non-alphanumeric characters except ORG prefix
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // If pasted with dashes, remove them
    if (cleaned.startsWith('ORG')) {
      cleaned = cleaned.replace(/^ORG/, '');
    }
    // Only allow up to 16 chars after ORG
    cleaned = cleaned.slice(0, 16);
    // Format as ORG-XXXX-XXXX-XXXX-XXXX
    const parts = cleaned.match(/.{1,4}/g) || [];
    return 'ORG-' + parts.join('-');
  };

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Format secret key as user types
    if (name === 'secretKey') {
      value = formatSecretKey(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (error) setError('');
  };

  /**
   * Validate a single field
   */
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'organizationName':
        if (!value.trim()) {
          error = 'Organization name is required';
        }
        break;

      case 'secretKey':
        if (!value) {
          error = 'Secret key is required';
        } else if (!/^ORG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) {
          error = 'Invalid format. Expected: ORG-XXXX-XXXX-XXXX-XXXX';
        }
        break;

      case 'firstName':
      case 'lastName':
        if (!value.trim()) {
          error = `${name === 'firstName' ? 'First' : 'Last'} name is required`;
        } else if (value.length < 2) {
          error = 'Must be at least 2 characters';
        }
        break;

      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;

      default:
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));

    return !error;
  };

  /**
   * Handle field blur
   */
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const requiredFields = ['organizationName', 'secretKey', 'firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    let isValid = true;
    
    requiredFields.forEach(name => {
      if (!validateField(name, formData[name])) {
        isValid = false;
      }
    });

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    if (passwordStrength.strength === 'weak') {
      setError('Please choose a stronger password');
      return;
    }

    if (!isValid) {
      setError('Please fix the errors above');
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalize secret key before sending: remove all non-alphanumeric, format properly
      let rawKey = (formData.secretKey || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Remove ORG prefix if present
      if (rawKey.startsWith('ORG')) {
        rawKey = rawKey.slice(3);
      }
      // Take only first 16 characters and format
      rawKey = rawKey.slice(0, 16);
      const parts = rawKey.match(/.{1,4}/g) || [];
      const normalizedKey = parts.length > 0 ? 'ORG-' + parts.join('-') : '';
      
      const result = await registerEmployee({
        organizationName: formData.organizationName.trim(),
        secretKey: normalizedKey,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department.trim(),
        password: formData.password
      });

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Registration failed. Please check your organization name and secret key.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render password requirement item
   */
  const RequirementItem = ({ met, text }) => (
    <div className={`flex items-center text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? (
        <Check className="h-3 w-3 mr-1" />
      ) : (
        <X className="h-3 w-3 mr-1" />
      )}
      {text}
    </div>
  );

  /**
   * Check if secret key format is valid
   */
  const isSecretKeyValid = /^ORG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formData.secretKey);

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Brain className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join an Organization
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your organization details and secret key
        </p>
      </div>

      {/* Form container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-lg sm:px-10 border border-gray-100">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Help text */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Need the secret key?</strong> Ask your organization admin for the organization name and secret key to join.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Organization Section */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Organization Details
              </h3>
              
              {/* Organization Name */}
              <div className="mb-4">
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input pl-10 ${fieldErrors.organizationName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="Enter your organization's name"
                  />
                </div>
                {fieldErrors.organizationName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.organizationName}</p>
                )}
              </div>

              {/* Secret Key */}
              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="secretKey"
                    name="secretKey"
                    type="text"
                    required
                    value={formData.secretKey}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input pl-10 font-mono ${fieldErrors.secretKey ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : isSecretKeyValid ? 'border-green-300 focus:ring-green-500 focus:border-green-500' : ''}`}
                    placeholder="ORG-XXXX-XXXX-XXXX-XXXX"
                    maxLength={24}
                  />
                  {isSecretKeyValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {fieldErrors.secretKey && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.secretKey}</p>
                )}
                {!fieldErrors.secretKey && formData.secretKey && !isSecretKeyValid && (
                  <p className="mt-1 text-xs text-gray-500">
                    Format: ORG-XXXX-XXXX-XXXX-XXXX
                  </p>
                )}
              </div>
            </div>

            {/* Personal Details Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your Account Details
              </h3>
              
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`input pl-10 ${fieldErrors.firstName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      placeholder="John"
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input mt-1 ${fieldErrors.lastName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="Doe"
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Work email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input pl-10 ${fieldErrors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="you@company.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Department */}
              <div className="mb-4">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="e.g., Engineering, Sales, HR"
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input pl-10 pr-10 ${fieldErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {/* Password strength */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      <div className={`h-1 flex-1 rounded ${passwordStrength.strength !== 'weak' ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                      <div className={`h-1 flex-1 rounded ${passwordStrength.strength === 'medium' ? 'bg-yellow-400' : passwordStrength.strength === 'strong' ? 'bg-green-400' : 'bg-gray-200'}`} />
                      <div className={`h-1 flex-1 rounded ${passwordStrength.strength === 'strong' ? 'bg-green-400' : 'bg-gray-200'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <RequirementItem met={passwordStrength.requirements.length} text="8+ characters" />
                      <RequirementItem met={passwordStrength.requirements.uppercase} text="Uppercase" />
                      <RequirementItem met={passwordStrength.requirements.lowercase} text="Lowercase" />
                      <RequirementItem met={passwordStrength.requirements.number} text="Number" />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I agree to the{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">Privacy Policy</a>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn btn-primary flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining Organization...
                </>
              ) : (
                <>
                  Join Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Want to create a new organization? </span>
            <Link to="/signup/organization" className="text-primary-600 hover:text-primary-500 font-medium">
              Create organization
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeSignupPage;
