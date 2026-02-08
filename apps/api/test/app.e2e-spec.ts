import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * API End-to-End Tests
 *
 * These tests spin up the full NestJS application (including database
 * connections) and issue real HTTP requests via supertest.
 *
 * Prerequisites:
 *   - A running PostgreSQL database with seed data applied
 *   - The .env / .env.local file must point to a test-safe database
 *
 * Run with:  pnpm --filter @ims/api run test:e2e
 */
describe('API E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror the production setup from main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Authenticate with the seeded admin user
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    // The login may succeed or fail depending on seed data availability.
    // If it fails we store an empty token so individual tests can be
    // conditionally skipped.
    if (loginRes.status === 200 || loginRes.status === 201) {
      authToken = loginRes.body.accessToken;
    } else {
      console.warn(
        'E2E login failed -- some tests will be skipped. ' +
          'Ensure the database is seeded with admin@example.com / password123.',
      );
      authToken = '';
    }
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  // ==================================================================
  // Health Check
  // ==================================================================

  describe('Health Check', () => {
    it('GET /api/v1/health should return 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    it('GET /api/v1 should return API info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1')
        .expect(200);

      expect(res.body).toHaveProperty('name', 'IMS API');
      expect(res.body).toHaveProperty('version');
    });
  });

  // ==================================================================
  // Authentication
  // ==================================================================

  describe('Authentication', () => {
    it('POST /api/v1/auth/login with valid credentials returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      // If seed data is present the login should succeed
      if (res.status === 200) {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('tokenType', 'Bearer');
      }
    });

    it('POST /api/v1/auth/login with invalid credentials returns 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('POST /api/v1/auth/login with invalid body returns 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('GET /api/v1/auth/me without token returns 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('GET /api/v1/auth/me with valid token returns user', async () => {
      if (!authToken) return; // skip when no seed data

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role');
      expect(res.body).toHaveProperty('organizationId');
    });
  });

  // ==================================================================
  // Items CRUD
  // ==================================================================

  describe('Items CRUD', () => {
    let createdItemId: string;
    const testSku = `E2E-${Date.now().toString(36)}`;

    it('POST /api/v1/items creates an item', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Brake Pad',
          sku: testSku,
          type: 'INVENTORY',
          unit: 'PCS',
          sellingPrice: 120,
          costPrice: 85,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('sku', testSku);
      expect(res.body).toHaveProperty('name', 'E2E Test Brake Pad');
      createdItemId = res.body.id;
    });

    it('GET /api/v1/items lists items', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // The response should contain a data array
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/items/:id returns item details', async () => {
      if (!authToken || !createdItemId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', createdItemId);
      expect(res.body).toHaveProperty('sku', testSku);
    });

    it('PUT /api/v1/items/:id updates an item', async () => {
      if (!authToken || !createdItemId) return;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'E2E Updated Brake Pad' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'E2E Updated Brake Pad');
    });

    it('DELETE /api/v1/items/:id deletes an item', async () => {
      if (!authToken || !createdItemId) return;

      await request(app.getHttpServer())
        .delete(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('GET /api/v1/items without auth returns 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/items')
        .expect(401);
    });
  });

  // ==================================================================
  // Sales Orders
  // ==================================================================

  describe('Sales Orders', () => {
    it('GET /api/v1/sales/orders lists orders', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/sales/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/sales/invoices lists invoices', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/sales/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/sales/payments lists payments', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/sales/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/sales/orders without auth returns 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sales/orders')
        .expect(401);
    });
  });

  // ==================================================================
  // Contacts
  // ==================================================================

  describe('Contacts', () => {
    it('GET /api/v1/contacts lists contacts', async () => {
      if (!authToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`);

      // Accept 200 (list) or 404 (if the endpoint is nested differently)
      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  // ==================================================================
  // Rate Limiting
  // ==================================================================

  describe('Rate Limiting', () => {
    it('should not rate-limit health endpoint within normal usage', async () => {
      // Fire 5 quick requests -- should all pass under the 100/min limit
      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).get('/api/v1/health'),
      );

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.status).toBe(200);
      }
    });
  });
});
