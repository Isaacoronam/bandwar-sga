from django.test import TestCase


class HealthEndpointTests(TestCase):
    def test_health_endpoint_returns_production_health_payload(self):
        response = self.client.get('/api/health/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'healthy')
        self.assertEqual(response.json()['database'], 'connected')
        self.assertEqual(response.json()['storage'], 'writable')
