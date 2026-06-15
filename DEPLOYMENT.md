# Deployment & Hosting Guide

## Pre-Deployment Security Checklist

### Backend Setup

1. **Server Requirements**
   - PHP 8.2+ 
   - MySQL 8.0+ or PostgreSQL 12+
   - Node.js 18+ (for build tools if needed)
   - Nginx or Apache with SSL/TLS

2. **Environment Configuration**
   ```bash
   # Copy and configure .env
   cp .env.example .env
   
   # Generate application key
   php artisan key:generate
   
   # Set production values
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com
   
   # Database credentials
   DB_CONNECTION=mysql
   DB_HOST=your-db-host
   DB_DATABASE=your-db-name
   DB_USERNAME=your-db-user
   DB_PASSWORD=your-strong-password
   
   # CORS - Add your domains
   CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

3. **Database Setup**
   ```bash
   # Run migrations
   php artisan migrate --force
   
   # Seed initial data (if migrations include seeders)
   php artisan db:seed --force
   ```

4. **Optimization**
   ```bash
   # Cache configuration
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   
   # Storage permissions
   chmod -R 775 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

5. **SSL/TLS Certificate**
   ```bash
   # Using Let's Encrypt with Certbot (Ubuntu/Debian)
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly -d yourdomain.com -d app.yourdomain.com
   sudo certbot renew --dry-run  # Test auto-renewal
   ```

### Frontend Setup

1. **Build Configuration**
   ```bash
   # Copy environment file
   cp .env.example .env.production
   
   # Update API host
   REACT_APP_API_HOST=yourdomain.com:443
   ```

2. **Build Web**
   ```bash
   npm run build
   # Output: build/ directory for deployment
   ```

3. **Deploy Web Build**
   - Upload `build/` directory to web server
   - Configure web server to serve index.html for all routes (SPA routing)

4. **Deploy Mobile App**
   - Use EAS Build for Expo projects
   - Follow Expo documentation for app store deployment

## Web Server Configuration

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Frontend static files
    location / {
        root /var/www/yourdomain/build;
        try_files $uri /index.html;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Apache Configuration Example

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/yourdomain/public

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Security Headers
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header set X-Frame-Options "DENY"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"

    # Laravel public directory
    <Directory /var/www/yourdomain/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteRule ^ index.php [QSA,L]
        </IfModule>
    </Directory>

    # Deny access to sensitive files
    <FilesMatch "^\.">
        Deny from all
    </FilesMatch>
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>
```

## Monitoring & Logging

### Application Logs
```bash
# View real-time logs
tail -f storage/logs/laravel.log

# Archive old logs
find storage/logs -name "*.log" -mtime +30 -delete
```

### Security Monitoring
- Monitor rate limit hits: `/storage/logs/laravel.log`
- Track failed authentication attempts
- Set up alerts for errors
- Use monitoring tools (e.g., Sentry, New Relic)

### Database Backups
```bash
# Automated daily backup
0 2 * * * /usr/bin/mysqldump -u username -p'password' database_name > /backups/db_$(date +\%Y\%m\%d).sql

# Or use managed database backup service
```

## Post-Deployment

1. **Verify Security**
   - Test HTTPS enforcement
   - Verify SSL certificate
   - Check security headers
   - Test rate limiting

2. **Performance Testing**
   - Load testing with tools like Apache Bench
   - Monitor API response times
   - Check database query performance

3. **Update Regularly**
   - Security patches
   - Dependency updates
   - Test updates in staging first

4. **Maintenance**
   - Weekly backups
   - Monthly security reviews
   - Quarterly penetration testing

## Troubleshooting

### CORS Issues
- Verify domain in `CorsMiddleware.php`
- Check browser console for specific origin errors
- Ensure API_BASE_URL matches CORS configuration

### SSL/TLS Issues
- Use SSL Labs SSL Test
- Ensure certificate is not expired
- Check certificate chain

### Rate Limiting Issues
- Verify settings in `RateLimitMiddleware.php`
- Check if proxies are setting correct IP headers
- Adjust limits based on usage patterns

## Production Deployment Providers

### Recommended Hosting
- **Backend**: DigitalOcean, AWS EC2, Linode, Heroku
- **Database**: AWS RDS, DigitalOcean Managed Database, PlanetScale
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront

### Using Managed Services
- Database: Uses provider's security features
- SSL/TLS: Automatic with Let's Encrypt or provider's certs
- Backups: Provider-managed
- Monitoring: Provider's dashboard + custom alerts
