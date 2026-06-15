# Security Configuration Guide

## Overview
This document outlines the security measures implemented in this project for web hosting.

## Backend Security

### 1. Rate Limiting
- **General API Rate Limit**: 60 requests per minute per IP address
- **Auth Endpoints**: 5 requests per minute (register/login)
- **Failed Login Attempts**: 5 attempts per 15 minutes per IP

### 2. Password Security
- **Minimum Length**: 8 characters
- **Requirements**: Mixed case + numbers + symbols
- **Hashing**: Bcrypt with salting (via Laravel's Hash facade)
- **Token Expiration**: 525600 minutes (1 year) - adjust as needed

### 3. CORS (Cross-Origin Resource Sharing)
- Whitelist only trusted domains in `.env` via `CORS_ALLOWED_ORIGINS`
- Development: `http://localhost:8081, http://localhost:8080, http://localhost:3000`
- Production: Add your actual domain(s)

### 4. Secure Headers
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (XSS protection)
- **Content-Security-Policy**: Restrictive policy to prevent injected content
- **Strict-Transport-Security**: Forces HTTPS on all connections (30 days)
- **Permissions-Policy**: Disables dangerous features (geolocation, camera, microphone, payment)

### 5. SQL Injection Prevention
- Uses Laravel Eloquent ORM with parameterized queries
- All inputs validated before database operations
- Request validation applied to all endpoints

### 6. Authentication & Authorization
- **Token-Based**: API Token Sanctum for stateless authentication
- **Bearer Token**: Secure token passed in Authorization header
- **Token Revocation**: Tokens deleted on logout
- **Per-Request Validation**: All protected routes validate token

### 7. Input Sanitization
- XSS prevention via HTML entity encoding
- String inputs sanitized in `SecurityRequest` base class
- Max length validation on all string fields
- Type validation on all inputs

## Frontend Security

### 1. HTTPS Enforcement
- Production environment enforces HTTPS protocol
- Development allows HTTP for localhost
- Set `REACT_APP_API_HOST` environment variable for production

### 2. Secure Token Storage
- Tokens stored in `expo-secure-store` (encrypted on device)
- Not stored in plain text or localStorage
- Cleared on logout

### 3. API Configuration
Update `src/services/authService.ts` with production API host:
```bash
REACT_APP_API_HOST=yourdomain.com:443
```

## Deployment Checklist

### Before Going Live

1. **Backend Environment**
   ```bash
   # Generate secure APP_KEY if not already set
   php artisan key:generate
   
   # Set strong credentials
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com
   ```

2. **CORS Configuration**
   - Update `backend/app/Http/Middleware/CorsMiddleware.php`
   - Add your domain(s) to `$allowedOrigins`

3. **SSL/TLS Certificate**
   - Obtain from Let's Encrypt (free) or your provider
   - Install on web server
   - Configure auto-renewal

4. **Database**
   - Use strong, random password
   - Restrict database access by IP
   - Enable database backups
   - Consider using managed database service

5. **API Rate Limiting**
   - Review and adjust `API_RATE_LIMIT` values in `.env`
   - Test with expected user load

6. **Secrets Management**
   - Never commit `.env` file
   - Use environment variables on hosting provider
   - Rotate API keys periodically
   - Use strong `APP_KEY` (32-character base64 string)

7. **Logging & Monitoring**
   - Configure application logs
   - Set up error tracking (e.g., Sentry)
   - Monitor API rate limit hits
   - Track failed authentication attempts

## Security Best Practices

### Regular Maintenance
- Keep Laravel and dependencies updated: `composer update`
- Keep Node dependencies updated: `npm update`
- Review security advisories regularly

### API Keys & Tokens
- Rotate API tokens periodically
- Use separate tokens for different services
- Never expose tokens in frontend code
- Regenerate tokens after security incidents

### Database
- Regular backups (automated daily minimum)
- Backup encryption and secure storage
- Test restore procedures
- Limit database user permissions

### Monitoring
- Monitor authentication logs for suspicious activity
- Alert on multiple failed login attempts from same IP
- Track API rate limit violations
- Monitor for unusual data access patterns

### User Data
- Encrypt sensitive data at rest
- Use HTTPS for all data in transit
- Implement proper data retention policies
- Follow GDPR/privacy regulations if applicable

## Testing Security

### Manual Testing Checklist
- [ ] Test login with weak password (should be rejected)
- [ ] Test SQL injection attempts (should be safe)
- [ ] Test CORS with unauthorized origin (should be blocked)
- [ ] Test rate limiting (exceed limits and verify blocking)
- [ ] Test expired tokens (should be rejected)
- [ ] Test HTTPS enforcement (HTTP redirects to HTTPS)
- [ ] Verify security headers in response

### Automated Testing
```bash
# Backend - Run tests
php artisan test

# Check for known vulnerabilities
composer audit
npm audit
```

## Emergency Response

### If Compromised
1. Revoke all active tokens: Clear Sanctum tokens table
2. Force password reset for all users
3. Rotate application keys
4. Review access logs for suspicious activity
5. Update security credentials
6. Notify users of incident

### Security Update Procedure
1. Update dependencies in dev environment
2. Run full test suite
3. Deploy to staging for verification
4. Deploy to production
5. Monitor for issues

## Additional Resources
- [Laravel Security](https://laravel.com/docs/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PHP Security](https://www.php.net/manual/en/security.php)
- [React Native Security](https://reactnative.dev/docs/security)

## Questions or Issues?
Report security issues responsibly. Do not disclose publicly until patched.
