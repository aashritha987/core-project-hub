# Backend (Django + SQLite)

## Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api`

Demo users:
- `alex@company.com / admin123`
- `sarah@company.com / pm123`
- `james@company.com / dev123`
- `maria@company.com / dev123`
- `david@company.com / view123`
