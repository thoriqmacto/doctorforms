# DoctorForms API (`apps/api`)

Laravel 11 backend for DoctorForms.

## Requirements

- PHP 8.2+
- Composer
- SQLite or MySQL

## Setup

```bash
cd apps/api
composer install
cp env.example .env
php artisan key:generate
```

For SQLite local development:

```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/apps/api/database/database.sqlite
```

Then migrate and seed:

```bash
php artisan migrate --seed
```

## Run

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

## Tests

```bash
php artisan test
```

## API routes

Main versioned routes are exposed under `/api/v1`:

- templates
- template-fields
- patients
- reports
- tests
- hospitals
- users

Health endpoint:

- `GET /api/ping`
