#!/bin/bash
# ============================================
# MedBuddy Backend - Azure App Service Startup
# ============================================

set -e

echo "🚀 Starting MedBuddy Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
python << END
import time
import os
import psycopg2

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            dbname=os.environ.get('DB_NAME', 'medbuddy_db'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            host=os.environ.get('DB_HOST'),
            port=os.environ.get('DB_PORT', '5432'),
            sslmode='require'
        )
        conn.close()
        print("✅ Database is ready!")
        break
    except Exception as e:
        retry_count += 1
        print(f"Database not ready, retrying... ({retry_count}/{max_retries})")
        time.sleep(2)

if retry_count == max_retries:
    print("❌ Could not connect to database")
    exit(1)
END

# Run database migrations
echo "🔄 Running database migrations..."
python manage.py migrate --noinput --settings=medbuddy_api.settings_production

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --settings=medbuddy_api.settings_production

# Create superuser if not exists (optional - controlled by env var)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "👤 Creating superuser..."
    python manage.py shell --settings=medbuddy_api.settings_production << END
from django.contrib.auth import get_user_model
import os

User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@medbuddy.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if password and not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        email=email,
        password=password,
        first_name='Admin',
        last_name='User'
    )
    print(f"✅ Superuser {email} created")
else:
    print("ℹ️ Superuser already exists or password not set")
END
fi

echo "✅ Startup complete! Starting Gunicorn..."

# Start Gunicorn
exec gunicorn \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-4} \
    --threads ${GUNICORN_THREADS:-2} \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance \
    medbuddy_api.wsgi:application
