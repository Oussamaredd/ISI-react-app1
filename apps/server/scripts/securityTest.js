import { performanceMonitor } from '../monitoring/performanceMonitor.js';

export class SecurityTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      securityHeaders: {},
      authenticationTests: [],
      inputValidation: [],
      rateLimiting: {},
      encryptionTests: []
    };
    
    this.targetURL = process.argv[2] || 'http://localhost:5000';
    this.endpoints = [
      '/auth/me',
      '/api/tickets',
      '/api/hotels', 
      '/api/admin/users',
      '/api/admin/hotels',
      '/api/admin/settings'
    ];
  }

  async runSecurityTests() {
    console.log('🔒 Starting comprehensive security tests...');
    
    await Promise.allSettled([
      this.testSecurityHeaders(),
      this.testInputValidation(),
      this.testAuthentication(),
      this.testRateLimiting(),
      this.testSQLInjection(),
      this.testXSS(),
      this.testCSRF(),
      this.testPathTraversal(),
      this.testAuthenticationBypass()
    ]);
    
    this.generateReport();
  }

  async testSecurityHeaders() {
    console.log('🛡 Testing security headers...');
    
    const results = {};
    
    for (const endpoint of this.endpoints) {
      const url = `${this.targetURL}${endpoint}`;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Test-Header': 'test-value'
          }
        });
        
        const headers = {
          'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
          'X-Frame-Options': response.headers.get('X-Frame-Options'),
          'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
          'Strict-Transport-Security': response.headers.get('Strict-Transport-Security'),
          'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
          'Referrer-Policy': response.headers.get('Referrer-Policy')
        };
        
        results[endpoint] = headers;
        
        // Evaluate security headers
        this.evaluateHeader(endpoint, 'X-Frame-Options', headers['X-Frame-Options'], ['DENY', 'SAMEORIGIN']);
        this.evaluateHeader(endpoint, 'X-XSS-Protection', headers['X-XSS-Protection'], '1; mode=block');
        this.evaluateHeader(endpoint, 'Strict-Transport-Security', headers['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains; preload');
        this.evaluateHeader(endpoint, 'X-Content-Type-Options', headers['X-Content-Type-Options'], 'nosniff');
        
      } catch (error) {
        results[endpoint] = { error: error.message };
      }
    }
    
    this.results.securityHeaders = results;
    return results;
  }

  evaluateHeader(endpoint, header, value, expectedValues) {
    const isSecure = expectedValues.some(expected => 
      typeof value === 'string' ? value.toLowerCase().includes(expected.toLowerCase()) : value === expected
    );
    
    if (!isSecure) {
      this.results.vulnerabilities.push({
        type: 'security_header_misconfiguration',
        endpoint,
        header,
        value,
        expected: expectedValues,
        severity: 'medium'
      });
    }
  }

  async testInputValidation() {
    console.log('🧪 Testing input validation...');
    
    const testCases = [
      {
        endpoint: '/api/tickets',
        method: 'POST',
        data: { name: '<script>alert("xss")</script>' },
        expectedStatus: 400,
        description: 'XSS in name field'
      },
      {
        endpoint: '/api/tickets',
        method: 'POST', 
        data: { name: 'A'.repeat(1000) },
        expectedStatus: 400,
        description: 'Long input validation'
      },
      {
        endpoint: '/api/tickets',
        method: 'POST',
        data: { price: -999 },
        expectedStatus: 400,
        description: 'Negative price validation'
      },
      {
        endpoint: '/api/admin/users',
        method: 'GET',
        params: { id: '../../../etc/passwd' },
        expectedStatus: 400,
        description: 'Path traversal attempt'
      }
    ];
    
    for (const testCase of testCases) {
      try {
        const url = `${this.targetURL}${testCase.endpoint}`;
        const response = await fetch(url, {
          method: testCase.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Type': 'input-validation'
          },
          body: JSON.stringify(testCase.params || testCase.data)
        });
        
        const isSecure = response.status === testCase.expectedStatus;
        
        if (!isSecure) {
          this.results.vulnerabilities.push({
            type: 'input_validation_failure',
            endpoint: testCase.endpoint,
            method: testCase.method,
            payload: testCase.data || testCase.params,
            receivedStatus: response.status,
            expectedStatus: testCase.expectedStatus,
            severity: 'high',
            description: testCase.description
          });
        }
        
      } catch (error) {
        console.error(`Input validation test failed:`, error);
      }
    }
    
    this.results.inputValidation = testCases.map(tc => tc.endpoint);
  }

  async testAuthentication() {
    console.log('🔐 Testing authentication controls...');
    
    const authTests = [
      {
        name: 'unauthorized_access',
        endpoint: '/api/admin/users',
        method: 'GET',
        headers: {},
        expectedStatus: 401,
        description: 'Access without authentication'
      },
      {
        name: 'session_hijacking',
        endpoint: '/auth/me',
        method: 'GET', 
        headers: { 'Cookie': 'session_id=malicious' },
        expectedStatus: 401,
        description: 'Invalid session cookie'
      },
      {
        name: 'weak_password_policy',
        endpoint: '/api/admin/users',
        method: 'POST',
        data: { password: '123456' },
        headers: { 'X-Test-Type': 'weak-password' },
        expectedStatus: 400,
        description: 'Weak password acceptance'
      }
    ];
    
    for (const test of authTests) {
      try {
        const url = `${this.targetURL}${test.endpoint}`;
        const response = await fetch(url, {
          method: test.method,
          headers: test.headers,
          body: test.data ? JSON.stringify(test.data) : undefined
        });
        
        const isSecure = response.status === test.expectedStatus;
        
        if (!isSecure) {
          this.results.vulnerabilities.push({
            type: 'authentication_bypass',
            test: test.name,
            endpoint: test.endpoint,
            severity: 'critical',
            description: test.description,
            receivedStatus: response.status
          });
        }
        
      } catch (error) {
        console.error(`Authentication test failed:`, error);
      }
    }
    
    this.results.authenticationTests = authTests.map(test => test.name);
  }

  async testRateLimiting() {
    console.log('🚦 Testing rate limiting...');
    
    const startRequests = async () => {
      const requests = [];
      
      for (let i = 0; i < 105; i++) { // Send 5 more than typical limit
        try {
          const response = await fetch(`${this.targetURL}/api/tickets`, {
            method: 'GET',
            headers: {
              'X-Rate-Limit-Test': 'burst'
            }
          });
          
          requests.push({
            status: response.status,
            timestamp: Date.now()
          });
          
        } catch (error) {
          console.error(`Rate limit test request ${i} failed:`, error);
        }
      }
      
      const successRequests = requests.filter(r => r.status === 200).length;
      const blockedRequests = requests.filter(r => r.status === 429).length;
      
      return {
        totalRequests: requests.length,
        successRequests,
        blockedRequests,
        rateLimitWorking: blockedRequests > 0
      };
    };
    
    const results = await startRequests();
    
    if (!results.rateLimitWorking) {
      this.results.vulnerabilities.push({
        type: 'rate_limiting_not_working',
        severity: 'high',
        description: 'Rate limiting not properly blocking excessive requests'
      });
    }
    
    this.results.rateLimiting = results;
  }

  async testSQLInjection() {
    console.log('💉 Testing SQL injection protection...');
    
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT username, password FROM users --",
      "' OR '1'='1' /*",
      "%' OR '1'='1' --"
    ];
    
    for (const payload of sqlPayloads) {
      try {
        const response = await fetch(`${this.targetURL}/api/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Test-Type': 'sql-injection'
          },
          body: `search=${encodeURIComponent(payload)}`
        });
        
        if (response.status !== 400) {
          this.results.vulnerabilities.push({
            type: 'sql_injection_vulnerability',
            payload,
            endpoint: '/api/tickets',
            receivedStatus: response.status,
            severity: 'critical',
            description: 'SQL injection payload was not rejected'
          });
        }
        
      } catch (error) {
        console.error(`SQL injection test failed for ${payload}:`, error);
      }
    }
  }

  async testXSS() {
    console.log('🔥 Testing XSS protection...');
    
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)"></svg>',
      '"><script>alert(1)</script><"',
      'javascript:alert(1)',
      '"><iframe src="javascript:alert(1)"></iframe>'
    ];
    
    for (const payload of xssPayloads) {
      try {
        const response = await fetch(`${this.targetURL}/api/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Type': 'xss'
          },
          body: JSON.stringify({ name: payload })
        });
        
        if (response.status !== 400) {
          this.results.vulnerabilities.push({
            type: 'xss_vulnerability',
            payload: payload.substring(0, 50) + '...',
            endpoint: '/api/tickets',
            receivedStatus: response.status,
            severity: 'high',
            description: 'XSS payload was not rejected'
          });
        }
        
      } catch (error) {
        console.error(`XSS test failed:`, error);
      }
    }
  }

  async testCSRF() {
    console.log('🛡 Testing CSRF protection...');
    
    // Test if state-changing endpoints accept POST without CSRF token
    const stateChangingEndpoints = [
      '/api/tickets',
      '/api/admin/users',
      '/api/admin/hotels'
    ];
    
    for (const endpoint of stateChangingEndpoints) {
      try {
        const response = await fetch(`${this.targetURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Type': 'csrf',
            'Origin': 'http://malicious-site.com'
          },
          body: JSON.stringify({ 
            name: 'Test Ticket',
            status: 'OPEN' 
          })
        });
        
        const hasCSRFProtection = response.status === 403 || 
                                       response.headers.get('X-CSRF-Token') ||
                                       response.headers.get('Access-Control-Allow-Origin');
        
        if (!hasCSRFProtection) {
          this.results.vulnerabilities.push({
            type: 'csrf_vulnerability',
            endpoint,
            receivedStatus: response.status,
            severity: 'high',
            description: 'Missing CSRF protection on state-changing endpoint'
          });
        }
        
      } catch (error) {
        console.error(`CSRF test failed for ${endpoint}:`, error);
      }
    }
  }

  async testPathTraversal() {
    console.log('🛤 Testing path traversal protection...');
    
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
      '%252e%252e%252f%252fetc%252fpasswd'
    ];
    
    for (const payload of pathTraversalPayloads) {
      try {
        const response = await fetch(`${this.targetURL}/api/tickets`, {
          method: 'GET',
          headers: {
            'X-Test-Type': 'path-traversal'
          }
        });
        
        if (response.status !== 400 && response.status !== 404) {
          this.results.vulnerabilities.push({
            type: 'path_traversal_vulnerability',
            payload: payload.substring(0, 20) + '...',
            endpoint: '/api/tickets',
            receivedStatus: response.status,
            severity: 'critical',
            description: 'Path traversal payload was not properly blocked'
          });
        }
        
      } catch (error) {
        console.error(`Path traversal test failed:`, error);
      }
    }
  }

  async testAuthenticationBypass() {
    console.log('🔓 Testing authentication bypass techniques...');
    
    const bypassAttempts = [
      {
        name: 'parameter_pollution',
        payload: '/api/tickets?admin=true&id=1',
        description: 'Admin parameter pollution'
      },
      {
        name: 'header_injection',
        headers: { 'X-Forwarded-Host': 'localhost' },
        description: 'Host header injection attempt'
      },
      {
        name: 'method_overriding',
        headers: { 'X-HTTP-Method-Override': 'ADMIN' },
        description: 'HTTP method override attempt'
      }
    ];
    
    for (const attempt of bypassAttempts) {
      try {
        const url = typeof attempt.payload === 'string' 
          ? `${this.targetURL}${attempt.payload}`
          : `${this.targetURL}/api/tickets`;
          
        const options = {
          method: 'GET',
          headers: {
            'X-Test-Type': 'auth-bypass'
          }
        };
        
        if (attempt.headers) {
          options.headers = { ...options.headers, ...attempt.headers };
        }
        
        const response = await fetch(url, options);
        
        // These should be blocked or not provide admin access
        const isSecure = response.status === 403 || response.status === 401;
        
        if (!isSecure) {
          this.results.vulnerabilities.push({
            type: 'authentication_bypass',
            attempt: attempt.name,
            payload: attempt.payload || attempt.headers,
            endpoint: attempt.payload || '/api/tickets',
            receivedStatus: response.status,
            severity: 'critical',
            description: `Potential ${attempt.description}: ${attempt.name}`
          });
        }
        
      } catch (error) {
        console.error(`Authentication bypass test failed:`, error);
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      target: this.targetURL,
      summary: {
        totalVulnerabilities: this.results.vulnerabilities.length,
        criticalIssues: this.results.vulnerabilities.filter(v => v.severity === 'critical').length,
        highIssues: this.results.vulnerabilities.filter(v => v.severity === 'high').length,
        mediumIssues: this.results.vulnerabilities.filter(v => v.severity === 'medium').length,
        lowIssues: this.results.vulnerabilities.filter(v => v.severity === 'low').length
      },
      results: this.results
    };
    
    // Save report
    const fs = require('fs');
    const filename = `security-test-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log('\n🔒 SECURITY ASSESSMENT REPORT');
    console.log('='.repeat(50));
    console.log(`Target: ${this.targetURL}`);
    console.log(`Vulnerabilities Found: ${this.results.vulnerabilities.length}`);
    console.log(`Critical: ${report.summary.criticalIssues}`);
    console.log(`High: ${report.summary.highIssues}`);
    console.log(`Medium: ${report.summary.mediumIssues}`);
    console.log(`Low: ${report.summary.lowIssues}`);
    console.log(`Report saved to: ${filename}`);
    console.log('='.repeat(50));
    
    // Print critical and high severity issues
    const criticalAndHigh = this.results.vulnerabilities.filter(
      v => v.severity === 'critical' || v.severity === 'high'
    );
    
    if (criticalAndHigh.length > 0) {
      console.log('\n🚨 CRITICAL & HIGH SEVERITY ISSUES:');
      criticalAndHigh.forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.type.toUpperCase()}: ${vuln.description}`);
        console.log(`   Endpoint: ${vuln.endpoint}`);
        console.log(`   Severity: ${vuln.severity}`);
        if (vuln.payload) {
          console.log(`   Payload: ${JSON.stringify(vuln.payload)}`);
        }
      });
    }
    
    return report;
  }
}

// CLI interface
export async function runSecurityTest() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔒 Security Testing Tool');
    console.log('\nUsage:');
    console.log('  node security-test.js <target-url>');
    console.log('\nOptions:');
    console.log('  --detailed    Run detailed vulnerability scans');
    console.log('  --headers-only Test only security headers');
    process.exit(1);
  }
  
  const options = {
    detailed: args.includes('--detailed'),
    headersOnly: args.includes('--headers-only')
  };
  
  const url = args[0];
  
  if (!url.startsWith('http')) {
    console.error('Please provide a valid URL starting with http:// or https://');
    process.exit(1);
  }
  
  const tester = new SecurityTester();
  tester.targetURL = url;
  
  console.log(`🔒 Starting security test for: ${url}`);
  console.log(`Options: ${JSON.stringify(options)}`);
  
  try {
    await tester.runSecurityTests();
  } catch (error) {
    console.error('Security test failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTest();
}