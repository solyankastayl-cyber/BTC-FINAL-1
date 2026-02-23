#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Fractal Module
Tests all endpoints related to the fractal overlay functionality
"""

import requests
import json
import sys
import time
from datetime import datetime

class FractalBackendTester:
    def __init__(self, base_url="https://fractal-logic-update-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": test_name,
            "passed": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            passed = response.status_code == 200
            details = f"Status: {response.status_code}"
            if passed and response.text:
                details += f", Response: {response.text[:100]}"
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
        self.log_test("Health Check", passed, details)
        return passed

    def test_fractal_overlay_basic(self):
        """Test fractal overlay endpoint with default parameters"""
        try:
            url = f"{self.base_url}/api/fractal/v2.1/overlay"
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                passed = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                data = response.json()
                # Check required fields
                required_fields = ['symbol', 'currentWindow', 'matches']
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    passed = False
                    details = f"Missing fields: {missing_fields}"
                else:
                    passed = True
                    matches_count = len(data.get('matches', []))
                    details = f"Symbol: {data.get('symbol')}, Matches: {matches_count}"
                    
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
        self.log_test("Fractal Overlay Basic", passed, details)
        return passed

    def test_fractal_overlay_horizon_30d(self):
        """Test fractal overlay with 30D horizon"""
        try:
            url = f"{self.base_url}/api/fractal/v2.1/overlay?symbol=BTC&aftermathDays=30"
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                passed = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                data = response.json()
                matches = data.get('matches', [])
                if matches:
                    first_match = matches[0]
                    aftermath_len = len(first_match.get('aftermathNormalized', []))
                    passed = aftermath_len >= 20
                    details = f"Matches: {len(matches)}, Aftermath length: {aftermath_len}"
                else:
                    passed = False
                    details = "No matches returned"
                    
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
        self.log_test("Fractal Overlay 30D Horizon", passed, details)
        return passed

    def test_fractal_overlay_horizon_180d(self):
        """Test fractal overlay with 180D horizon"""
        try:
            url = f"{self.base_url}/api/fractal/v2.1/overlay?symbol=BTC&aftermathDays=180"
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                passed = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                data = response.json()
                matches = data.get('matches', [])
                if matches:
                    first_match = matches[0]
                    aftermath_len = len(first_match.get('aftermathNormalized', []))
                    passed = aftermath_len >= 150
                    details = f"Matches: {len(matches)}, Aftermath length: {aftermath_len}"
                else:
                    passed = False
                    details = "No matches returned"
                    
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
        self.log_test("Fractal Overlay 180D Horizon", passed, details)
        return passed

    def test_fractal_overlay_horizon_365d(self):
        """Test fractal overlay with 365D horizon (CRITICAL)"""
        try:
            url = f"{self.base_url}/api/fractal/v2.1/overlay?symbol=BTC&aftermathDays=365"
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                passed = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                data = response.json()
                matches = data.get('matches', [])
                if matches:
                    first_match = matches[0]
                    aftermath_len = len(first_match.get('aftermathNormalized', []))
                    passed = aftermath_len >= 300
                    details = f"Matches: {len(matches)}, Aftermath length: {aftermath_len}"
                    
                    # Also check distribution series
                    dist_series = data.get('distributionSeries')
                    if dist_series:
                        p10_len = len(dist_series.get('p10', []))
                        details += f", Distribution series length: {p10_len}"
                else:
                    passed = False
                    details = "No matches returned"
                    
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
        self.log_test("Fractal Overlay 365D Horizon", passed, details)
        return passed

    def test_strategy_endpoint(self):
        """Test strategy endpoint with different modes"""
        modes = ['conservative', 'balanced', 'aggressive']
        all_passed = True
        details_list = []
        
        for mode in modes:
            try:
                url = f"{self.base_url}/api/fractal/v2.1/strategy?symbol=BTC&preset={mode}"
                response = requests.get(url, timeout=30)
                
                if response.status_code != 200:
                    all_passed = False
                    details_list.append(f"{mode}: HTTP {response.status_code}")
                else:
                    data = response.json()
                    # Check required fields
                    required_fields = ['decision', 'edge', 'diagnostics', 'regime']
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        all_passed = False
                        details_list.append(f"{mode}: Missing fields {missing_fields}")
                    else:
                        details_list.append(f"{mode}: OK")
                        
            except Exception as e:
                all_passed = False
                details_list.append(f"{mode}: Error {str(e)}")
        
        details = "; ".join(details_list)
        self.log_test("Strategy Endpoint (All Modes)", all_passed, details)
        return all_passed

    def test_forward_equity_endpoint(self):
        """Test forward equity endpoint with different parameters"""
        test_cases = [
            {'preset': 'BALANCED', 'horizon': 7, 'role': 'ACTIVE'},
            {'preset': 'CONSERVATIVE', 'horizon': 14, 'role': 'SHADOW'},
            {'preset': 'AGGRESSIVE', 'horizon': 30, 'role': 'ACTIVE'}
        ]
        
        all_passed = True
        details_list = []
        
        for case in test_cases:
            try:
                params = f"symbol=BTC&preset={case['preset']}&horizon={case['horizon']}&role={case['role']}"
                url = f"{self.base_url}/api/fractal/v2.1/admin/forward-equity?{params}"
                response = requests.get(url, timeout=30)
                
                if response.status_code != 200:
                    all_passed = False
                    details_list.append(f"{case['preset']}-{case['horizon']}D: HTTP {response.status_code}")
                else:
                    data = response.json()
                    if data.get('error'):
                        all_passed = False
                        details_list.append(f"{case['preset']}-{case['horizon']}D: API Error {data.get('error')}")
                    else:
                        # Check if we have equity data or empty result
                        equity_len = len(data.get('equity', []))
                        details_list.append(f"{case['preset']}-{case['horizon']}D: {equity_len} points")
                        
            except Exception as e:
                all_passed = False
                details_list.append(f"{case['preset']}-{case['horizon']}D: Error {str(e)}")
        
        details = "; ".join(details_list)
        self.log_test("Forward Equity Endpoint (All Params)", all_passed, details)
        return all_passed

    def test_admin_endpoint(self):
        """Test if admin endpoint is accessible"""
        try:
            endpoints = [
                f"{self.base_url}/admin/fractal",
                f"{self.base_url}/api/admin/fractal"
            ]
            
            passed = False
            details = ""
            
            for endpoint in endpoints:
                try:
                    response = requests.get(endpoint, timeout=10)
                    if response.status_code in [200, 401, 403]:
                        passed = True
                        details += f"{endpoint}: HTTP {response.status_code}; "
                    else:
                        details += f"{endpoint}: HTTP {response.status_code}; "
                except Exception as e:
                    details += f"{endpoint}: {str(e)}; "
                    
            if not passed:
                details = f"All admin endpoints failed: {details}"
                
        except Exception as e:
            passed = False
            details = f"Error: {str(e)}"
        
    def run_all_tests(self):
        """Run all fractal backend tests"""
        print("🚀 Starting Fractal Backend API Tests")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print()
        
        # Test order - critical tests first
        test_methods = [
            self.test_health_check,
            self.test_strategy_endpoint,  # NEW - Critical for Strategy Controls
            self.test_forward_equity_endpoint,  # NEW - Critical for Forward Performance
            self.test_fractal_overlay_basic,
            self.test_fractal_overlay_horizon_30d,
            self.test_fractal_overlay_horizon_180d,
            self.test_fractal_overlay_horizon_365d,  # Critical test
            self.test_admin_endpoint
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, f"Test execution error: {str(e)}")
            
            time.sleep(0.5)  # Brief pause between tests
        
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   - {result['test_name']}: {result['details']}")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    """Main test execution"""
    tester = FractalBackendTester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results
    test_results = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "passed": passed,
            "total": total,
            "success_rate": f"{(passed/total*100):.1f}%" if total > 0 else "0%"
        },
        "tests": results
    }
    
    with open('/app/backend/backend_test_results.json', 'w') as f:
        json.dump(test_results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend/backend_test_results.json")
    
    # Return exit code based on success
    critical_tests = ['Fractal Overlay 365D Horizon', 'Fractal Overlay Basic']
    critical_failures = [r for r in results if r['test_name'] in critical_tests and not r['passed']]
    
    if critical_failures:
        print(f"\n🚨 Critical test failures detected!")
        return 1
    
    if passed / total < 0.7:  # Less than 70% pass rate
        print(f"\n⚠️  Low success rate: {passed}/{total}")
        return 1
    
    print(f"\n✅ Backend tests completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())