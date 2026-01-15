import { performanceMonitor } from '../monitoring/performanceMonitor.js';

export class LoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: []
    };
    
    this.concurrentUsers = 1;
    this.testDuration = 60; // seconds
    this.rampUpTime = 10; // seconds
    this.url = 'http://localhost:5000/api/tickets';
  }

  async runLoadTest(options = {}) {
    const {
      concurrentUsers = 1,
      testDuration = 60,
      rampUpTime = 10,
      url = this.url,
      endpoints = ['/api/tickets', '/api/hotels', '/api/admin/users']
    } = options;

    this.concurrentUsers = concurrentUsers;
    this.testDuration = testDuration;
    this.rampUpTime = rampUpTime;
    this.url = url;

    console.log(`🚀 Starting load test: ${concurrentUsers} concurrent users for ${testDuration}s`);
    console.log(`📊 Target endpoints: ${endpoints.join(', ')}`);

    const startTime = Date.now();
    const promises = [];

    // Create concurrent users
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.simulateUser(i + 1, endpoints));
      
      // Stagger user start for ramp-up
      if (this.rampUpTime > 0 && i > 0) {
        const delay = (this.rampUpTime / concurrentUsers) * i * 1000;
        setTimeout(() => {}, delay);
      }
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Load test failed:', error);
    }

    const endTime = Date.now();
    const actualDuration = (endTime - startTime) / 1000;

    this.generateReport(actualDuration);
    return this.results;
  }

  async simulateUser(userId, endpoints) {
    const userRequests = [];
    const startTime = Date.now();
    
    // Simulate user behavior throughout the test duration
    const interval = setInterval(async () => {
      // Random endpoint selection with realistic distribution
      const endpoint = this.selectRandomEndpoint(endpoints);
      const method = this.selectMethod(endpoint);
      
      try {
        const requestStart = Date.now();
        const response = await this.makeRequest(method, endpoint, userId);
        const requestEnd = Date.now();
        
        this.results.totalRequests++;
        
        if (response.success) {
          this.results.successfulRequests++;
          
          const responseTime = requestEnd - requestStart;
          this.results.averageResponseTime = 
            (this.results.averageResponseTime * (this.results.totalRequests - 1) + responseTime) / this.results.totalRequests;
          this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
          this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
        } else {
          this.results.failedRequests++;
          this.results.errors.push({
            userId,
            endpoint,
            error: response.error,
            timestamp: requestEnd
          });
        }
        
        userRequests.push({
          endpoint,
          method,
          success: response.success,
          responseTime: requestEnd - requestStart,
          timestamp: requestEnd
        });
        
      } catch (error) {
        this.results.failedRequests++;
        this.results.errors.push({
          userId,
          endpoint,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      // Random delay between requests (simulating user think time)
      const nextRequestDelay = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    }, Math.random() * 3000 + 500); // Random interval 0.5-3.5 seconds

    // Stop the test after duration
    setTimeout(() => {
      clearInterval(interval);
      console.log(`User ${userId} completed test`);
    }, this.testDuration * 1000);

    return new Promise(resolve => {
      setTimeout(() => resolve(), this.testDuration * 1000);
    });
  }

  selectRandomEndpoint(endpoints) {
    const weights = {
      '/api/tickets': 0.4,    // Most accessed
      '/api/hotels': 0.35,   // Second most
      '/api/admin/users': 0.15, // Admin operations
      '/api/dashboard': 0.1   // Dashboard access
    };
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const [endpoint, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return endpoint;
      }
    }
    
    return endpoints[0]; // Fallback
  }

  selectMethod(endpoint) {
    const methods = {
      '/api/tickets': ['GET', 'POST'],
      '/api/hotels': ['GET'],
      '/api/admin/users': ['GET', 'PUT'],
      '/api/dashboard': ['GET']
    };
    
    const availableMethods = methods[endpoint] || ['GET'];
    return availableMethods[Math.floor(Math.random() * availableMethods.length)];
  }

  async makeRequest(method, endpoint, userId) {
    const url = `${this.url}${endpoint}`;
    const startTime = Date.now();
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Load-Test-User': userId.toString(),
          'X-Load-Test': 'true'
        }
      };

      // Add body for POST/PUT requests
      if (method !== 'GET') {
        const body = this.generateRequestBody(method, endpoint);
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      const endTime = Date.now();
      
      return {
        success: true,
        status: response.status,
        data,
        responseTime: endTime - startTime
      };
      
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: error.message,
        responseTime: endTime - startTime
      };
    }
  }

  generateRequestBody(method, endpoint) {
    if (method === 'POST' && endpoint === '/api/tickets') {
      return {
        name: `Load Test Ticket ${Date.now()}`,
        price: Math.random() * 100 + 50,
        status: 'OPEN',
        hotel_id: Math.floor(Math.random() * 5) + 1
      };
    }
    
    if (method === 'PUT' && endpoint === '/api/admin/users') {
      return {
        name: `Load Test User ${Date.now()}`,
        email: `loadtest${Date.now()}@example.com`
      };
    }
    
    return null;
  }

  generateReport(actualDuration) {
    // Calculate metrics
    const totalRequests = this.results.totalRequests;
    const successRate = totalRequests > 0 ? (this.results.successfulRequests / totalRequests * 100).toFixed(2) : 0;
    const avgResponseTime = this.results.averageResponseTime.toFixed(2);
    const rps = (totalRequests / actualDuration).toFixed(2);
    
    console.log('\n📊 Load Test Results');
    console.log('='.repeat(50));
    console.log(`Test Duration: ${actualDuration}s`);
    console.log(`Concurrent Users: ${this.concurrentUsers}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Requests: ${this.results.successfulRequests}`);
    console.log(`Failed Requests: ${this.results.failedRequests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Average Response Time: ${avgResponseTime}ms`);
    console.log(`Min Response Time: ${this.results.minResponseTime}ms`);
    console.log(`Max Response Time: ${this.results.maxResponseTime}ms`);
    console.log(`Requests Per Second: ${rps}`);
    console.log(`Errors: ${this.results.errors.length}`);
    
    // Categorize performance
    const performance = this.categorizePerformance();
    console.log(`\n🎯 Performance Category: ${performance.category}`);
    console.log(`📝 Assessment: ${performance.assessment}`);
    
    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('='.repeat(50));
    
    // Generate detailed report
    this.generateDetailedReport();
  }

  categorizePerformance() {
    const avgResponseTime = this.results.averageResponseTime;
    const successRate = (this.results.successfulRequests / this.results.totalRequests * 100);
    
    if (avgResponseTime < 200 && successRate > 99) {
      return {
        category: 'EXCELLENT',
        assessment: 'System is performing exceptionally well under load'
      };
    }
    
    if (avgResponseTime < 500 && successRate > 95) {
      return {
        category: 'GOOD',
        assessment: 'System is handling load well with acceptable performance'
      };
    }
    
    if (avgResponseTime < 1000 && successRate > 90) {
      return {
        category: 'ACCEPTABLE',
        assessment: 'System performance is acceptable but may need optimization'
      };
    }
    
    if (avgResponseTime < 2000 && successRate > 80) {
      return {
        category: 'POOR',
        assessment: 'System is struggling with current load, optimization needed'
      };
    }
    
    return {
      category: 'CRITICAL',
      assessment: 'System performance is critical, immediate attention required'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const avgResponseTime = this.results.averageResponseTime;
    const successRate = (this.results.successfulRequests / this.results.totalRequests * 100);
    
    if (avgResponseTime > 1000) {
      recommendations.push('Optimize database queries - consider adding indexes');
      recommendations.push('Implement caching for frequently accessed data');
    }
    
    if (successRate < 95) {
      recommendations.push('Investigate error patterns and improve error handling');
      recommendations.push('Add circuit breakers for failing services');
    }
    
    if (this.results.maxResponseTime > avgResponseTime * 3) {
      recommendations.push('Investigate outlier requests causing high response times');
    }
    
    if (this.results.totalRequests / this.testDuration < 10) {
      recommendations.push('Consider increasing concurrent users for better testing');
    }
    
    return recommendations;
  }

  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        concurrentUsers: this.concurrentUsers,
        testDuration: this.testDuration,
        rampUpTime: this.rampUpTime,
        url: this.url
      },
      results: this.results,
      performance: this.categorizePerformance(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report to file
    const fs = require('fs');
    const filename = `load-test-report-${Date.now()}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\n📁 Detailed report saved to: ${filename}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
    
    return report;
  }
}

// CLI interface for running load tests
export async function runLoadTest() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 Load Testing Tool');
    console.log('\nUsage:');
    console.log('  node load-test.js --users=10 --duration=60 --url=http://localhost:5000');
    console.log('\nOptions:');
    console.log('  --users <number>     Number of concurrent users (default: 1)');
    console.log('  --duration <seconds>  Test duration in seconds (default: 60)');
    console.log('  --url <url>        Target URL (default: http://localhost:5000)');
    console.log('  --rampup <seconds>  Ramp-up time in seconds (default: 10)');
    process.exit(1);
  }
  
  const options = {};
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    switch (key) {
      case '--users':
        options.concurrentUsers = parseInt(value);
        break;
      case '--duration':
        options.testDuration = parseInt(value);
        break;
      case '--url':
        options.url = value;
        break;
      case '--rampup':
        options.rampUpTime = parseInt(value);
        break;
    }
  });
  
  const loadTester = new LoadTester();
  await loadTester.runLoadTest(options);
}

// Run load test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoadTest();
}