# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Application Access Password
APP_PASSWORD=your_secure_password_here

# AWS Credentials (Textract)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=af-south-1
```

## AWS Permissions

The IAM user/role must have permission to call Textract:

- `textract:AnalyzeDocument`

## Security Notes

- Never commit `.env.local` to version control
- Keep your API keys secure
- Change `APP_PASSWORD` to a strong, unique password
