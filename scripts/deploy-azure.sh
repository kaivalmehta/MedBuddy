#!/bin/bash
# ============================================
# MedBuddy - Azure Deployment Script
# Deploys infrastructure and applications
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-medbuddy-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  MedBuddy Azure Deployment${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Please log in to Azure...${NC}"
    az login
fi

# Show current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}Using subscription: ${SUBSCRIPTION}${NC}"

# Create Resource Group if it doesn't exist
echo -e "${YELLOW}Creating resource group if not exists...${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo -e "${GREEN}Resource group ready: ${RESOURCE_GROUP}${NC}"

# Deploy Infrastructure
echo -e "${YELLOW}Deploying infrastructure...${NC}"
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file ./infrastructure/main.bicep \
    --parameters environment=$ENVIRONMENT \
    --query "properties.outputs" \
    --output json)

# Extract outputs
ACR_LOGIN_SERVER=$(echo $DEPLOYMENT_OUTPUT | jq -r '.containerRegistryLoginServer.value')
BACKEND_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.backendUrl.value')
FRONTEND_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.frontendUrl.value')
POSTGRES_HOST=$(echo $DEPLOYMENT_OUTPUT | jq -r '.postgresHost.value')

echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
echo -e "${BLUE}Container Registry: ${ACR_LOGIN_SERVER}${NC}"
echo -e "${BLUE}Backend URL: ${BACKEND_URL}${NC}"
echo -e "${BLUE}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${BLUE}PostgreSQL Host: ${POSTGRES_HOST}${NC}"

# Get ACR credentials
echo -e "${YELLOW}Getting ACR credentials...${NC}"
ACR_NAME=$(echo $ACR_LOGIN_SERVER | cut -d'.' -f1)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Login to ACR
echo -e "${YELLOW}Logging in to Azure Container Registry...${NC}"
echo $ACR_PASSWORD | docker login $ACR_LOGIN_SERVER -u $ACR_USERNAME --password-stdin

# Build and push backend image
echo -e "${YELLOW}Building backend image...${NC}"
docker build -t $ACR_LOGIN_SERVER/medbuddy-backend:latest ./backend

echo -e "${YELLOW}Pushing backend image...${NC}"
docker push $ACR_LOGIN_SERVER/medbuddy-backend:latest

# Build and push frontend image
echo -e "${YELLOW}Building frontend image...${NC}"
docker build \
    --build-arg VITE_API_URL=$BACKEND_URL/api \
    -t $ACR_LOGIN_SERVER/medbuddy-frontend:latest \
    ./frontend

echo -e "${YELLOW}Pushing frontend image...${NC}"
docker push $ACR_LOGIN_SERVER/medbuddy-frontend:latest

# Update Container Apps to use new images
echo -e "${YELLOW}Updating backend container app...${NC}"
az containerapp update \
    --name medbuddy-backend-$ENVIRONMENT \
    --resource-group $RESOURCE_GROUP \
    --image $ACR_LOGIN_SERVER/medbuddy-backend:latest \
    --output none

echo -e "${YELLOW}Updating frontend container app...${NC}"
az containerapp update \
    --name medbuddy-frontend-$ENVIRONMENT \
    --resource-group $RESOURCE_GROUP \
    --image $ACR_LOGIN_SERVER/medbuddy-frontend:latest \
    --output none

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Your MedBuddy application is now deployed:${NC}"
echo -e "  Frontend: ${FRONTEND_URL}"
echo -e "  Backend API: ${BACKEND_URL}"
echo -e "  API Docs: ${BACKEND_URL}/api/docs/"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Configure Azure AI services (Vision, OpenAI, Speech, etc.)"
echo "  2. Set up Azure Communication Services for email"
echo "  3. Update environment variables in Container Apps"
echo "  4. Run database migrations: az containerapp exec --name medbuddy-backend-$ENVIRONMENT --resource-group $RESOURCE_GROUP --command 'python manage.py migrate'"
echo ""
