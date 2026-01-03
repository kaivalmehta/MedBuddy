# MedBuddy - Azure Deployment Guide

> Intelligent Prescription Management Platform for the Microsoft Imagine Cup 2026

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Cloud                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Frontend   │    │   Backend    │    │   PostgreSQL     │  │
│  │   (React)    │───▶│   (Django)   │───▶│   Flexible       │  │
│  │   Nginx      │    │   Gunicorn   │    │   Server         │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘  │
│         │                   │                                    │
│         │            ┌──────┴───────┐                           │
│         │            │  Azure AI    │                           │
│         │            │  Services    │                           │
│         │            ├──────────────┤                           │
│         │            │ • Vision     │    ┌──────────────────┐  │
│         │            │ • OpenAI     │    │   Blob Storage   │  │
│         │            │ • Speech     │───▶│   (Prescriptions)│  │
│         │            │ • Translator │    └──────────────────┘  │
│         │            │ • Maps       │                           │
│         │            └──────────────┘                           │
│         │                                                        │
│  ┌──────┴───────┐                       ┌──────────────────┐   │
│  │ Azure CDN    │                       │  Communication   │   │
│  │ (Optional)   │                       │  Services (Email)│   │
│  └──────────────┘                       └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (v2.50+)
- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Node.js](https://nodejs.org/) (v20+)
- [Python](https://www.python.org/) (v3.11+)

### Azure Requirements
- Active Azure subscription
- Permissions to create resources (Contributor role)

## 🚀 Quick Start

### Option 1: Automated Deployment

```bash
# Clone the repository
git clone https://github.com/yourusername/medbuddy.git
cd medbuddy

# Login to Azure
az login

# Run deployment script
chmod +x scripts/deploy-azure.sh
./scripts/deploy-azure.sh
```

### Option 2: Manual Deployment

#### Step 1: Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="medbuddy-rg"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy infrastructure using Bicep
az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file ./infrastructure/main.bicep \
    --parameters environment=prod
```

#### Step 2: Build and Push Docker Images

```bash
# Get ACR credentials
ACR_NAME=$(az acr list -g $RESOURCE_GROUP --query "[0].name" -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push backend
docker build -t $ACR_LOGIN_SERVER/medbuddy-backend:latest ./backend
docker push $ACR_LOGIN_SERVER/medbuddy-backend:latest

# Build and push frontend (replace API_URL with your backend URL)
docker build \
    --build-arg VITE_API_URL=https://your-backend-url.azurecontainerapps.io/api \
    -t $ACR_LOGIN_SERVER/medbuddy-frontend:latest \
    ./frontend
docker push $ACR_LOGIN_SERVER/medbuddy-frontend:latest
```

#### Step 3: Configure Azure AI Services

After deployment, configure these Azure services in the Azure Portal:

1. **Azure AI Vision** - For prescription OCR
2. **Azure OpenAI** - For AI-powered analysis
3. **Azure Speech Services** - For text-to-speech
4. **Azure Translator** - For multi-language support
5. **Azure Maps** - For pharmacy/lab location
6. **Azure Communication Services** - For email notifications

#### Step 4: Update Environment Variables

```bash
# Update backend container app with Azure AI keys
az containerapp update \
    --name medbuddy-backend-prod \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars \
        "AZURE_VISION_ENDPOINT=https://your-vision.cognitiveservices.azure.com/" \
        "AZURE_VISION_KEY=your-key" \
        "AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/" \
        "AZURE_OPENAI_KEY=your-key" \
        "AZURE_SPEECH_KEY=your-key" \
        "AZURE_TRANSLATOR_KEY=your-key" \
        "AZURE_MAPS_KEY=your-key"
```

## 📁 Project Structure

```
medbuddy/
├── backend/                    # Django REST API
│   ├── medbuddy_api/          # Main Django project
│   │   ├── settings.py        # Development settings
│   │   ├── settings_production.py  # Production settings
│   │   ├── urls.py            # URL routing
│   │   └── wsgi.py            # WSGI entry point
│   ├── users/                 # User management app
│   ├── prescriptions/         # Prescription management
│   ├── pharmacy/              # Pharmacy features
│   ├── analytics/             # Analytics app
│   ├── Dockerfile             # Backend Docker image
│   ├── startup.sh             # Azure startup script
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── context/           # React context
│   │   └── hooks/             # Custom hooks
│   ├── Dockerfile             # Frontend Docker image
│   ├── nginx.conf             # Nginx configuration
│   ├── vite.config.js         # Vite configuration
│   └── package.json           # Node dependencies
│
├── infrastructure/             # Azure Infrastructure
│   └── main.bicep             # Bicep template
│
├── scripts/                    # Deployment scripts
│   └── deploy-azure.sh        # Main deployment script
│
├── .github/
│   └── workflows/
│       └── azure-deploy.yml   # CI/CD pipeline
│
├── docker-compose.yml         # Local development
├── docker-compose.prod.yml    # Production compose
├── .env.example               # Environment template
└── .env.production.example    # Production env template
```

## 🔧 Local Development

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../.env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Docker Compose (Full Stack)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔐 Security Considerations

### Production Checklist

- [ ] Change default `SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` properly
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up Azure DDoS protection
- [ ] Configure backup retention
- [ ] Enable Azure Monitor alerts

### Environment Variables

Never commit these to version control:
- `SECRET_KEY`
- `DB_PASSWORD`
- All `*_KEY` and `*_CONNECTION_STRING` values

Use Azure Key Vault for production secrets.

## 📊 Monitoring & Logging

### Azure Monitor

The deployment includes Log Analytics integration. Access logs via:

```bash
# View backend logs
az containerapp logs show \
    --name medbuddy-backend-prod \
    --resource-group medbuddy-rg \
    --follow

# View frontend logs
az containerapp logs show \
    --name medbuddy-frontend-prod \
    --resource-group medbuddy-rg \
    --follow
```

### Health Endpoints

- Backend: `GET /api/health/`
- Frontend: `GET /health`

## 🔄 CI/CD with GitHub Actions

### Setup

1. Create these GitHub Secrets:
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `AZURE_ACR_LOGIN_SERVER` - ACR URL
   - `AZURE_ACR_USERNAME` - ACR username
   - `AZURE_ACR_PASSWORD` - ACR password
   - `VITE_API_URL` - Backend API URL

2. Create Service Principal:
```bash
az ad sp create-for-rbac \
    --name "medbuddy-github-actions" \
    --role contributor \
    --scopes /subscriptions/{subscription-id}/resourceGroups/medbuddy-rg \
    --sdk-auth
```

3. Push to `main` branch to trigger deployment

## 💰 Cost Estimation

| Resource | SKU | Est. Monthly Cost |
|----------|-----|-------------------|
| Container Apps (Backend) | 0.5 vCPU, 1Gi | ~$15 |
| Container Apps (Frontend) | 0.25 vCPU, 0.5Gi | ~$8 |
| PostgreSQL Flexible | B1ms | ~$15 |
| Storage Account | Standard LRS | ~$5 |
| Container Registry | Basic | ~$5 |
| **Total** | | **~$48/month** |

*Azure AI services billed separately based on usage*

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL firewall rules
az postgres flexible-server firewall-rule list \
    --resource-group medbuddy-rg \
    --name medbuddy-db-prod
```

**Container App Not Starting**
```bash
# Check container logs
az containerapp logs show \
    --name medbuddy-backend-prod \
    --resource-group medbuddy-rg \
    --tail 100
```

**CORS Errors**
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check `CSRF_TRUSTED_ORIGINS` setting

## 📞 Support

For issues or questions:
- Create a GitHub issue
- Contact: kashish@example.com

## 📄 License

This project is part of the Microsoft Imagine Cup 2026 competition.

---

