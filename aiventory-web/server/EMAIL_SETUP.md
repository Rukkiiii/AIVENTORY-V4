# Email Configuration Guide

## Why the email failed

The email failed because SMTP (email server) credentials are not configured. The system needs these settings to send emails to suppliers.

## Is the password necessary?

**Yes, the password is absolutely necessary** to send emails. Gmail (and most email providers) require authentication to prevent unauthorized use of email accounts. Without the password, the email server will reject the connection and emails cannot be sent.

**However**, you can test the system without the password - it will show an error message, but the rest of the application will continue to work normally.

## Quick Setup

1. **Create or edit `.env` file** in `aiventory-web/server/` directory

2. **Add these lines** to your `.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=philipyourdad8@gmail.com
SMTP_PASS=your-app-password
```

**Note:** The sender email is set to `philipyourdad8@gmail.com` by default. You only need to set `SMTP_PASS` (App Password) to start sending emails.

## Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Enable 2-Step Verification

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "AIVENTORY" as the name
4. Click "Generate"
5. Copy the 16-character password (no spaces)
6. Use this password as `SMTP_PASS` in your `.env` file

### Step 3: Update .env file
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=philipyourdad8@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Use the generated app password for philipyourdad8@gmail.com
```

**Important:** Generate the App Password for `philipyourdad8@gmail.com` account.

## Other Email Providers

### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

## After Configuration

1. **Restart the server** for changes to take effect:
   ```bash
   cd aiventory-web/server
   npm start
   ```

2. **Test the email** by clicking "Reorder Them All" button

## Troubleshooting

### Error: "Email authentication failed"
- Check that `SMTP_USER` and `SMTP_PASS` are correct
- For Gmail, make sure you're using an App Password, not your regular password
- Verify 2FA is enabled (for Gmail)

### Error: "Cannot connect to SMTP server"
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify your firewall isn't blocking the connection
- Try using port 465 with `SMTP_SECURE=true` instead

### Error: "Email configuration not set"
- Make sure `.env` file exists in `aiventory-web/server/` directory
- Verify the environment variables are spelled correctly
- Restart the server after adding the variables

## Security Note

⚠️ **Never commit your `.env` file to version control!** It contains sensitive credentials.

The `.env` file should already be in `.gitignore`, but double-check to ensure your email credentials are not exposed.

