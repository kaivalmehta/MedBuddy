// ============================================
// MedBuddy - Azure Infrastructure (Bicep)
// Deploy: az deployment group create --resource-group medbuddy-rg --template-file main.bicep
// ============================================

@description('The location for all resources')
param location string = resourceGroup().location

@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Base name for resources')
param baseName string = 'medbuddy'

// ==========================================
// Variables
// ==========================================
var uniqueSuffix = uniqueString(resourceGroup().id)
var containerRegistryName = '${baseName}acr${uniqueSuffix}'
var logAnalyticsName = '${baseName}-logs-${environment}'
var containerAppsEnvName = '${baseName}-env-${environment}'
var backendAppName = '${baseName}-backend-${environment}'
var frontendAppName = '${baseName}-frontend-${environment}'
var postgresServerName = '${baseName}-db-${environment}'
var storageAccountName = '${baseName}storage${uniqueSuffix}'
var keyVaultName = '${baseName}-kv-${environment}'

// ==========================================
// Azure Container Registry
// ==========================================
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// ==========================================
// Log Analytics Workspace
// ==========================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ==========================================
// Container Apps Environment
// ==========================================
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ==========================================
// Azure Database for PostgreSQL Flexible Server
// ==========================================
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: 'medbuddy_admin'
    administratorLoginPassword: '${uniqueSuffix}!Aa1234' // Change this in production!
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Firewall rule to allow Azure services
resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAllAzureIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Database
resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: 'medbuddy_db'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ==========================================
// Storage Account
// ==========================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob container for prescriptions
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource prescriptionContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'prescriptions'
  properties: {
    publicAccess: 'None'
  }
}

// ==========================================
// Key Vault
// ==========================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// ==========================================
// Backend Container App
// ==========================================
resource backendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'secret-key'
          value: guid(resourceGroup().id, deployment().name)
        }
        {
          name: 'db-password'
          value: '${uniqueSuffix}!Aa1234'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${containerRegistry.properties.loginServer}/medbuddy-backend:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'DJANGO_SETTINGS_MODULE', value: 'medbuddy_api.settings_production' }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'DEBUG', value: 'False' }
            { name: 'ALLOWED_HOSTS', value: '${backendAppName}.${containerAppsEnv.properties.defaultDomain}' }
            { name: 'DB_HOST', value: postgresServer.properties.fullyQualifiedDomainName }
            { name: 'DB_NAME', value: 'medbuddy_db' }
            { name: 'DB_USER', value: 'medbuddy_admin' }
            { name: 'DB_PASSWORD', secretRef: 'db-password' }
            { name: 'DB_PORT', value: '5432' }
            { name: 'CORS_ALLOWED_ORIGINS', value: 'https://${frontendAppName}.${containerAppsEnv.properties.defaultDomain}' }
            { name: 'CSRF_TRUSTED_ORIGINS', value: 'https://${frontendAppName}.${containerAppsEnv.properties.defaultDomain}' }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value}' }
            { name: 'AZURE_STORAGE_CONTAINER_NAME', value: 'prescriptions' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health/'
                port: 8000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health/'
                port: 8000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// ==========================================
// Frontend Container App
// ==========================================
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: frontendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${containerRegistry.properties.loginServer}/medbuddy-frontend:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 80
              }
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// ==========================================
// Outputs
// ==========================================
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output storageAccountName string = storageAccount.name
