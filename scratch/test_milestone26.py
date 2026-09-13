#!/usr/bin/env python3
"""
Test Suite: Milestone 26 — Performance Optimization (and Milestones 24 & 25)
Validates lazy route loading, API request cancellation, debounced search,
pagination, SignalR subscriber registry, selective memoization, image optimization,
JWT auto-logout, mobile bottom navigation, and responsive CSS breakpoints.
"""

import os
import re
import sys
import glob

REPO_ROOT = "/Volumes/personal/project/Food/SaveBite"
WEB_DIR = os.path.join(REPO_ROOT, "SaveBite.Web")
DIST_DIR = os.path.join(WEB_DIR, "dist")

def test_lazy_loading_and_bundle_size():
    print("=== Test 1: Lazy Route Loading & Bundle Code-Splitting ===")
    app_tsx = os.path.join(WEB_DIR, "src", "App.tsx")
    with open(app_tsx, "r", encoding="utf-8") as f:
        content = f.read()

    assert "lazy(" in content, "App.tsx must use React.lazy"
    assert "<Suspense" in content, "App.tsx must wrap routes with <Suspense>"
    assert "</Suspense>" in content, "App.tsx must close </Suspense>"

    # Check that individual pages are lazy loaded
    assert "lazy(() => import(\"./pages/LandingPage\"))" in content
    assert "lazy(() => import(\"./pages/customer/FoodDiscoveryPage\")" in content
    assert "lazy(() => import(\"./pages/admin/AdminDashboardPage\")" in content

    # Check dist build assets
    js_chunks = glob.glob(os.path.join(DIST_DIR, "assets", "*.js"))
    assert len(js_chunks) >= 15, f"Expected >= 15 code-split JS chunks, found {len(js_chunks)}"

    main_index_chunks = [c for c in js_chunks if os.path.basename(c).startswith("index-")]
    assert len(main_index_chunks) >= 1, "Main index bundle must exist in dist/assets"

    main_chunk_size = os.path.getsize(main_index_chunks[0])
    main_chunk_kb = main_chunk_size / 1024
    print(f"  ✓ Found {len(js_chunks)} code-split chunks. Main entry bundle size: {main_chunk_kb:.1f} kB")
    assert main_chunk_kb < 500, f"Main bundle ({main_chunk_kb:.1f} kB) must be smaller than 500 kB"
    print("  ✓ Lazy route loading and code-splitting verified successfully.")

def test_api_cancellation_and_debounce():
    print("\n=== Test 2: API Request Cancellation & Debounce Hook ===")
    debounce_file = os.path.join(WEB_DIR, "src", "hooks", "useDebounce.ts")
    assert os.path.isfile(debounce_file), "useDebounce.ts hook must exist"
    with open(debounce_file, "r", encoding="utf-8") as f:
        d_content = f.read()
    assert "setTimeout" in d_content and "clearTimeout" in d_content, "useDebounce must handle timers cleanly"

    api_file = os.path.join(WEB_DIR, "src", "services", "api.ts")
    with open(api_file, "r", encoding="utf-8") as f:
        api_content = f.read()
    assert "isCancel" in api_content, "api.ts must export isCancel helper"
    assert "axios.isCancel(error)" in api_content, "api.ts response interceptor must ignore canceled requests"

    customer_svc = os.path.join(WEB_DIR, "src", "services", "customerService.ts")
    with open(customer_svc, "r", encoding="utf-8") as f:
        cs_content = f.read()
    assert "signal?: AbortSignal" in cs_content, "searchNearbyFood must accept optional AbortSignal"
    assert "{ signal }" in cs_content, "searchNearbyFood must pass signal to Axios"

    food_discovery = os.path.join(WEB_DIR, "src", "pages", "customer", "FoodDiscoveryPage.tsx")
    with open(food_discovery, "r", encoding="utf-8") as f:
        fd_content = f.read()
    assert "useDebounce" in fd_content, "FoodDiscoveryPage must use useDebounce"
    assert "AbortController" in fd_content, "FoodDiscoveryPage must use AbortController"
    assert "abortControllerRef.current.abort()" in fd_content, "FoodDiscoveryPage must abort in-flight requests"
    print("  ✓ API request cancellation and debounced search verified.")

def test_pagination_components():
    print("\n=== Test 3: Pagination Component & Multi-Page Adoption ===")
    pagination_file = os.path.join(WEB_DIR, "src", "components", "common", "Pagination.tsx")
    assert os.path.isfile(pagination_file), "Pagination.tsx component must exist"
    with open(pagination_file, "r", encoding="utf-8") as f:
        p_content = f.read()
    assert "React.memo" in p_content, "Pagination component should be memoized"
    assert "ellipsis" in p_content or "..." in p_content, "Pagination must implement ellipsis"
    assert "safeCurrentPage - 1" in p_content, "Pagination must support Prev"
    assert "safeCurrentPage + 1" in p_content, "Pagination must support Next"

    pages_using_pagination = [
        "src/pages/customer/FoodDiscoveryPage.tsx",
        "src/pages/customer/CustomerOrdersPage.tsx",
        "src/pages/restaurant/RestaurantOrdersPage.tsx",
        "src/pages/admin/AdminUsersPage.tsx",
        "src/pages/admin/AdminOrdersPage.tsx",
        "src/pages/admin/AdminDeliveriesPage.tsx",
    ]

    for p in pages_using_pagination:
        full_path = os.path.join(WEB_DIR, p)
        assert os.path.isfile(full_path), f"Page {p} must exist"
        with open(full_path, "r", encoding="utf-8") as f:
            c = f.read()
        assert "<Pagination" in c, f"Page {p} must render <Pagination />"
        print(f"  ✓ {p} implements Pagination component.")

def test_signalr_subscriptions():
    print("\n=== Test 4: Efficient SignalR Subscriptions ===")
    sig_service = os.path.join(WEB_DIR, "src", "services", "signalrService.ts")
    with open(sig_service, "r", encoding="utf-8") as f:
        ss_content = f.read()

    assert "savebite_token" in ss_content, "SignalRService must read savebite_token from localStorage"
    assert "orderStatusListeners: Set<" in ss_content, "SignalRService must maintain Set listener registry"
    assert "deliveryStatusListeners: Set<" in ss_content
    assert "notificationListeners: Set<" in ss_content

    sig_context = os.path.join(WEB_DIR, "src", "context", "SignalRContext.tsx")
    with open(sig_context, "r", encoding="utf-8") as f:
        sc_content = f.read()
    assert "useMemo" in sc_content, "SignalRContext must memoize its context value object"
    print("  ✓ Efficient SignalR subscriptions and listener registries verified.")

def test_memoization_and_images():
    print("\n=== Test 5: Memoization & Image Optimization ===")
    food_card = os.path.join(WEB_DIR, "src", "components", "food", "FoodCard.tsx")
    assert os.path.isfile(food_card), "FoodCard.tsx must exist"
    with open(food_card, "r", encoding="utf-8") as f:
        fc_content = f.read()
    assert "React.memo" in fc_content, "FoodCard must be wrapped in React.memo"
    assert "OptimizedImage" in fc_content, "FoodCard must use OptimizedImage"

    opt_img = os.path.join(WEB_DIR, "src", "components", "common", "OptimizedImage.tsx")
    assert os.path.isfile(opt_img), "OptimizedImage.tsx must exist"
    with open(opt_img, "r", encoding="utf-8") as f:
        img_content = f.read()
    assert 'loading="lazy"' in img_content, "OptimizedImage must have loading='lazy'"
    assert 'decoding="async"' in img_content, "OptimizedImage must have decoding='async'"
    assert "sb-opt-img-skeleton" in img_content, "OptimizedImage must have skeleton placeholder"
    assert "sb-opt-img-fallback" in img_content, "OptimizedImage must have fallback plate"
    print("  ✓ Memoized components and OptimizedImage verified.")

def test_security_and_mobile_ux():
    print("\n=== Test 6: Security (M24) & Mobile UX (M25) ===")
    # 1. No secret keys
    for root, _, files in os.walk(os.path.join(WEB_DIR, "src")):
        for file in files:
            if file.endswith((".ts", ".tsx", ".js")):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                assert "AI_SERVICE_KEY" not in content, f"Forbidden secret key found in {file}"
                assert "GEMINI_API_KEY" not in content, f"Forbidden secret key found in {file}"
    print("  ✓ Zero exposed secret keys in SaveBite.Web.")

    # 2. JWT auto-logout in AuthContext
    auth_context = os.path.join(WEB_DIR, "src", "context", "AuthContext.tsx")
    with open(auth_context, "r", encoding="utf-8") as f:
        ac_content = f.read()
    assert "getTokenRemainingTimeMs" in ac_content, "AuthContext must calculate remaining token time"
    assert "setTimeout" in ac_content, "AuthContext must schedule auto-logout timeout"
    assert "visibilitychange" in ac_content, "AuthContext must listen for visibilitychange"
    print("  ✓ JWT auto-logout and visibilitychange checks verified in AuthContext.")

    # 3. Mobile Bottom Navigation
    mobile_nav = os.path.join(WEB_DIR, "src", "components", "layout", "MobileBottomNav.tsx")
    assert os.path.isfile(mobile_nav), "MobileBottomNav.tsx component must exist"

    customer_layout = os.path.join(WEB_DIR, "src", "components", "layout", "CustomerLayout.tsx")
    delivery_layout = os.path.join(WEB_DIR, "src", "components", "layout", "DeliveryLayout.tsx")
    with open(customer_layout, "r", encoding="utf-8") as f:
        assert "<MobileBottomNav" in f.read(), "CustomerLayout must render MobileBottomNav"
    with open(delivery_layout, "r", encoding="utf-8") as f:
        assert "<MobileBottomNav" in f.read(), "DeliveryLayout must render MobileBottomNav"
    print("  ✓ Mobile bottom navigation integrated into Customer and Delivery layouts.")

    # 4. Responsive CSS breakpoints
    css_file = os.path.join(WEB_DIR, "src", "index.css")
    with open(css_file, "r", encoding="utf-8") as f:
        css_content = f.read()
    breakpoints = ["320px", "375px", "390px", "768px", "1024px", "1440px", "1920px"]
    for bp in breakpoints:
        assert bp in css_content, f"CSS must include rules for breakpoint {bp}"
        print(f"  ✓ Responsive breakpoint {bp} found in index.css.")

def main():
    print("Starting Milestone 26 (Performance) & Milestones 24-25 Verification...\n")
    test_lazy_loading_and_bundle_size()
    test_api_cancellation_and_debounce()
    test_pagination_components()
    test_signalr_subscriptions()
    test_memoization_and_images()
    test_security_and_mobile_ux()
    print("\n========================================================")
    print("ALL MILESTONE 26 PERFORMANCE TESTS PASSED SUCCESSFULLY!")
    print("========================================================")

if __name__ == "__main__":
    main()

