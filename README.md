# Food Delivery API Failure Simulator

A complete food delivery platform built to demonstrate and test various API failure scenarios. This application showcases how different types of API failures can be simulated and handled in production environments.

![Architecture Diagram](./docs/architecture_diagram.png)

## Features

### Core Application
- **User Management**: Multi-role system (customers, restaurant owners, drivers, admins)
- **Restaurant Management**: Browse restaurants, view menus, manage listings
- **Order System**: Full order lifecycle from placement to delivery
- **Payment Processing**: Simulated payment gateway integration
- **Delivery Tracking**: Real-time driver location tracking

### Failure Simulation Engine
The heart of this application - a configurable failure injection system that can simulate:

| Failure Type | HTTP Status | Description |
|--------------|-------------|-------------|
| **Rate Limiting** | 429 | Too many requests, API throttling |
| **Timeout** | 408/504 | Request/response timeouts |
| **Authentication** | 401 | Invalid/expired credentials |
| **Authorization** | 403 | Insufficient permissions |
| **Server Error** | 500 | Internal server errors |
| **Service Unavailable** | 503 | Service overload/down |
| **Bad Request** | 400/422 | Validation errors |
| **Dependency Failure** | 502/504 | External service failures |
| **Configuration Error** | 500 | Missing/wrong configuration |

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Cache**: Redis (rate limiting, sessions)
- **Authentication**: JWT tokens
- **Documentation**: Auto-generated OpenAPI/Swagger

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: NGINX (optional)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd food-delivery-api-failure-simulator

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python init_db.py

# Run the server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | password123 |
| Restaurant Owner | restaurant@example.com | password123 |
| Driver | driver@example.com | password123 |
| Admin | admin@example.com | admin123 |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh access token

### Restaurants
- `GET /api/v1/restaurants` - List restaurants
- `GET /api/v1/restaurants/{id}` - Get restaurant details
- `GET /api/v1/restaurants/{id}/menu` - Get restaurant menu

### Orders
- `GET /api/v1/orders/my-orders` - Get user's orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/{id}` - Get order details
- `PATCH /api/v1/orders/{id}/status` - Update order status

### Failure Simulator
- `GET /api/v1/failure-simulator/status` - Get simulator status
- `GET /api/v1/failure-simulator/scenarios` - List all scenarios
- `POST /api/v1/failure-simulator/scenarios/{name}/enable` - Enable scenario
- `POST /api/v1/failure-simulator/scenarios/{name}/disable` - Disable scenario
- `POST /api/v1/failure-simulator/presets/{name}/apply` - Apply preset
- `POST /api/v1/failure-simulator/reset` - Reset all scenarios

## Failure Simulator Usage

### 1. Access the Dashboard
Navigate to `/failure-simulator` in the frontend or use the API directly.

### 2. Enable the Simulator
Toggle the simulator ON to start injecting failures.

### 3. Choose a Preset
Select from predefined configurations:
- **Rate Limiting Demo**: Tests API throttling
- **Auth Failures Demo**: Tests authentication handling
- **Payment Issues Demo**: Tests payment error handling
- **Server Errors Demo**: Tests server failure scenarios
- **All Failures Demo**: Moderate failure across all types
- **Chaos Mode**: Maximum failure rates for stress testing
- **Clear All**: Disable all failures

### 4. Monitor Metrics
Watch real-time metrics including:
- Success/failure rates
- Request distribution
- Active scenarios

### 5. Test Your Application
Use the food delivery app normally while failures are injected. Observe how the UI handles different error scenarios.

## Architecture

### Request Flow with Failure Injection

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Frontend  │────▶│  API Gateway│────▶│ Failure Simulator   │
│  (React)    │     │   (NGINX)   │     │    Middleware       │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          │                       │                       │
                          ▼                       ▼                       ▼
                   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                   │   Inject    │        │   Inject    │        │   Inject    │
                   │   Failure   │        │   Failure   │        │   Failure   │
                   └─────────────┘        └─────────────┘        └─────────────┘
                          │                       │                       │
                          └───────────────────────┼───────────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────────┐
                                         │   Backend Services  │
                                         │     (FastAPI)       │
                                         └─────────────────────┘
```

### Failure Injection Points

1. **Rate Limiting**: Checked before request processing
2. **Authentication**: JWT token validation
3. **Authorization**: Role-based access control
4. **Validation**: Request data validation
5. **Business Logic**: Order processing, payment handling
6. **External APIs**: Payment gateway, maps, notifications
7. **Database**: Connection failures, timeouts

## Configuration

### Environment Variables

#### Backend (.env)
```env
DEBUG=true
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=food_delivery
REDIS_HOST=localhost
REDIS_PORT=6379
SECRET_KEY=your-secret-key
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

### Customizing Failure Scenarios

Edit `backend/app/core/failure_config.py` to modify default scenarios:

```python
DEFAULT_SCENARIOS = {
    "rate_limiting": FailureScenario(
        enabled=False,
        failure_type=FailureType.RATE_LIMIT,
        probability=0.5,  # 50% chance of failure
        endpoints=["/api/restaurants", "/api/orders"],
        rate_limit_requests=5,
        rate_limit_window=60,
    ),
    # Add your custom scenarios...
}
```

## Testing

### Run Backend Tests
```bash
cd backend
pytest
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Production Considerations

1. **Disable Failure Simulator**: Set `FAILURE_SIMULATOR_ENABLED=false`
2. **Use Production Database**: Configure PostgreSQL with proper credentials
3. **Enable HTTPS**: Use SSL certificates
4. **Set Strong Secret Key**: Change `SECRET_KEY` environment variable
5. **Configure CORS**: Update `CORS_ORIGINS` for your domain

### Cloud Deployment

The application can be deployed to:
- AWS (ECS, EKS, or EC2)
- Google Cloud Platform (Cloud Run or GKE)
- Azure (Container Instances or AKS)
- Heroku
- Railway
- Render

Example for Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Future Enhancements

### LLM Integration (Planned)
- **Failure Pattern Detection**: Use AI to identify failure patterns
- **Automated Root Cause Analysis**: Natural language explanations of failures
- **Preventive Recommendations**: Suggestions to prevent similar failures
- **Natural Language Query Interface**: Ask questions about system health

### Additional Features
- WebSocket real-time updates
- Prometheus metrics export
- Distributed tracing (OpenTelemetry)
- Load testing integration
- Custom failure scenario builder UI

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Frontend powered by [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts by [Recharts](https://recharts.org/)

## Support

For questions or issues:
- Open an issue on GitHub
- Check the API documentation at `/docs`
- Review the architecture diagrams in `/docs`

---

**Happy Testing!** 🚀
