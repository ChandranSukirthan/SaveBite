import { useEffect, useState, useRef } from "react";
import {
  getAdminAIActivity,
  retryAIOptimization,
  type AdminAIActivity,
} from "../../services/adminService";

export interface TimelineNode {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  technology: "LangGraph" | "Google Gemini" | "LangGraph Tool" | "SignalR Hub";
  techBadgeClass: string;
  techDetail: string;
  actionSummary: string;
  inputPreview: string;
  outputPreview: string;
  latencyMs: number;
  tokensEstimated: number;
  status: "idle" | "active" | "completed" | "branch";
  langgraphState: Record<string, any>;
  geminiPrompt?: string;
  geminiResponse?: string;
  toolDetails?: {
    toolName: string;
    arguments: Record<string, any>;
    result: Record<string, any>;
  };
}

export function AdminAIActivityPage() {
  // Agent view toggle: "food" | "delivery" | "route"
  const [activeAgent, setActiveAgent] = useState<"food" | "delivery" | "route">("food");
  
  // Delivery agent branch: "accepted" (happy path) vs "rejected" (self-healing retry)
  const [deliveryBranch, setDeliveryBranch] = useState<"accepted" | "rejected">("accepted");

  // Simulation playback state
  const [playbackState, setPlaybackState] = useState<"idle" | "playing" | "paused" | "completed">("idle");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 1.5x, 2x

  // Inspection Drawer
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"state" | "gemini" | "tool">("state");

  // Historical data from MongoDB
  const [activities, setActivities] = useState<AdminAIActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedHistoricalActivity, setSelectedHistoricalActivity] = useState<AdminAIActivity | null>(null);

  // Architecture summary collapsible
  const [archSummaryOpen, setArchSummaryOpen] = useState(true);

  const timerRef = useRef<any>(null);

  // Fetch real activities
  async function loadActivity() {
    try {
      setLoading(true);
      const data = await getAdminAIActivity();
      setActivities(data);
    } catch (err) {
      console.error("Failed to load AI activity", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  // Define Steps for Food Agent
  const foodNodes: TimelineNode[] = [
    {
      id: "food-step-1",
      stepNumber: 1,
      title: "Customer Request Received",
      subtitle: "LangGraph START node initialization",
      technology: "LangGraph",
      techBadgeClass: "adm-tech-langgraph",
      techDetail: "StateGraph START -> FoodAgentState",
      actionSummary: "FastAPI receives customer intent, extracts GPS coordinates, search radius (5km), and optional dietary preference.",
      inputPreview: "Customer ID: usr_cust_91 · Coordinates: [6.9271, 79.8612] · Radius: 5.0 km",
      outputPreview: "FoodAgentState initialized with HumanMessage customer intent query",
      latencyMs: 18,
      tokensEstimated: 85,
      status: "idle",
      langgraphState: {
        customer_id: "usr_cust_91",
        latitude: 6.9271,
        longitude: 79.8612,
        radius_in_kilometers: 5.0,
        category: "Bakery",
        max_price: 15.0,
        messages: [
          {
            type: "HumanMessage",
            content: "Find the best surplus bakery items near Colombo within $15 budget before closing.",
          },
        ],
      },
    },
    {
      id: "food-step-2",
      stepNumber: 2,
      title: "Customer Profile Loaded",
      subtitle: "ToolNode execution via get_customer_profile",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "LangChain StructuredTool -> C# REST API",
      actionSummary: "ToolNode executes `get_customer_profile` to retrieve dietary preferences, historical budget, and favorite surplus categories.",
      inputPreview: "customer_id = 'usr_cust_91'",
      outputPreview: "Profile: Vegan preference, Average Order: $12.50, Allergy: Peanuts",
      latencyMs: 145,
      tokensEstimated: 120,
      status: "idle",
      langgraphState: {
        customer_id: "usr_cust_91",
        profile: {
          fullName: "Emily Watson",
          dietaryRestrictions: ["Vegan"],
          allergies: ["Peanuts"],
          preferredCategories: ["Bakery", "Pastry", "Healthy"],
          maximumBudget: 15.0,
        },
      },
      toolDetails: {
        toolName: "get_customer_profile",
        arguments: { customer_id: "usr_cust_91" },
        result: {
          success: true,
          data: {
            fullName: "Emily Watson",
            preferredCategories: ["Bakery", "Pastry"],
            maximumBudget: 15.0,
            address: "Havelock Road, Colombo 05",
          },
        },
      },
    },
    {
      id: "food-step-3",
      stepNumber: 3,
      title: "Nearby Food Searched",
      subtitle: "ToolNode execution via search_nearby_food",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "2D Geospatial Query against MongoDB Atlas",
      actionSummary: "Executes `search_nearby_food` to find active surplus meals nearing expiry within the 5.0 km radius from verified restaurants.",
      inputPreview: "Location: [6.9271, 79.8612] · Max Radius: 5.0 km · Status: Available",
      outputPreview: "Retrieved 6 active surplus meals from 3 local bakeries",
      latencyMs: 230,
      tokensEstimated: 340,
      status: "idle",
      langgraphState: {
        food_candidates_count: 6,
        search_radius: "5.0 km",
        meals: [
          { id: "fd_01", name: "Artisan Sourdough Loaves (Pack of 3)", price: 4.5, expiry: "1.5 hrs remaining", dist: "1.2 km" },
          { id: "fd_02", name: "Vegan Croissant Bundle", price: 6.0, expiry: "2.0 hrs remaining", dist: "1.8 km" },
          { id: "fd_03", name: "Blueberry Cinnamon Danishes", price: 5.25, expiry: "45 mins remaining", dist: "2.4 km" },
        ],
      },
      toolDetails: {
        toolName: "search_nearby_food",
        arguments: {
          latitude: 6.9271,
          longitude: 79.8612,
          radius_in_kilometers: 5.0,
          category: "Bakery",
        },
        result: {
          success: true,
          count: 6,
          data: [
            { id: "fd_01", name: "Artisan Sourdough Loaves", price: 4.5, quantity: 4, distanceKm: 1.2 },
            { id: "fd_02", name: "Vegan Croissant Bundle", price: 6.0, quantity: 2, distanceKm: 1.8 },
          ],
        },
      },
    },
    {
      id: "food-step-4",
      stepNumber: 4,
      title: "Food Candidates Analyzed",
      subtitle: "Google Gemini Multi-Criteria Reasoning",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "gemini-3.8-flash · Structured Thinking",
      actionSummary: "Gemini evaluates candidate meals against customer profile, remaining rescue deadline urgency, distance proximity, and budget constraint.",
      inputPreview: "Evaluating 6 items vs Vegan profile, $15 budget, urgency factors",
      outputPreview: "Ranked candidates scored: Item #1 (96% fit), Item #2 (92% fit)",
      latencyMs: 420,
      tokensEstimated: 680,
      status: "idle",
      langgraphState: {
        evaluated_candidates: [
          { id: "fd_02", score: 96, rationale: "100% Vegan match, 55% discount, 1.8km distance, expires in 2 hrs." },
          { id: "fd_01", score: 92, rationale: "Plant-based sourdough, $4.50 budget winner, 1.2km proximity." },
        ],
      },
      geminiPrompt: `SYSTEM PROMPT: You are the SaveBite Food Matching Agent. Prioritize food approaching its availability deadline to reduce waste. Never recommend items above budget or violating customer dietary preferences.

EVALUATE: Customer is Vegan with $15 budget.
CANDIDATE A: Artisan Sourdough ($4.50, 1.2km, expires in 1.5h)
CANDIDATE B: Vegan Croissant Bundle ($6.00, 1.8km, expires in 2.0h, certified vegan)
CANDIDATE C: Blueberry Cinnamon Danishes (Contains dairy)`,
      geminiResponse: `THINKING: Candidate B is an explicit match for the customer's Vegan preference and well under the $15 budget. Candidate A is also naturally plant-based sourdough with high urgency. Candidate C must be eliminated due to dairy content.
SCORING:
- Candidate B: 96% Match (Dietary match + High Rescue Urgency)
- Candidate A: 92% Match (Budget Winner + Proximity)`,
    },
    {
      id: "food-step-5",
      stepNumber: 5,
      title: "Recommendation Generated",
      subtitle: "LangGraph END & Natural Language Delivery",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "Gemini Synthesis -> route_after_agent -> END",
      actionSummary: "Generates personalized conversational recommendations with badges (🎯 Preference Match, 💰 Budget Winner) and delivers to customer dashboard.",
      inputPreview: "Final ranked candidates synthesized into interactive recommendation cards",
      outputPreview: "✓ 2 Top Matches generated with personalized rescue rationales",
      latencyMs: 310,
      tokensEstimated: 450,
      status: "idle",
      langgraphState: {
        status: "COMPLETED",
        recommendations: [
          {
            foodId: "fd_02",
            name: "Vegan Croissant Bundle",
            matchScore: 96,
            badge: "🎯 Preference Match",
            reason: "Certified vegan pastry bundle matching your preferences at 50% discount before evening closing.",
          },
          {
            foodId: "fd_01",
            name: "Artisan Sourdough Loaves",
            matchScore: 92,
            badge: "💰 Budget Winner",
            reason: "Fresh sourdough loaf only 1.2 km away. High urgency rescue.",
          },
        ],
      },
      geminiResponse: `"We found 2 ideal surplus rescue opportunities for you! The top match is the Vegan Croissant Bundle (96% fit) which perfectly matches your vegan dietary preference and saves delicious bakery items from being wasted."`,
    },
  ];

  // Define Steps for Delivery Agent
  const deliveryAcceptedNodes: TimelineNode[] = [
    {
      id: "deliv-step-1",
      stepNumber: 1,
      title: "Delivery Request Received",
      subtitle: "Order marked ReadyForPickup -> StateGraph START",
      technology: "LangGraph",
      techBadgeClass: "adm-tech-langgraph",
      techDetail: "StateGraph START -> DeliveryAgentState",
      actionSummary: "Kitchen marks order ready for dispatch. Delivery request created with pickup GPS, destination GPS, and delivery fee.",
      inputPreview: "Order: #ORD-7812 · Kitchen: Green Leaf Bistro · Destination: 3.4 km",
      outputPreview: "DeliveryAgentState initialized with retry_count=0, max_retries=3",
      latencyMs: 22,
      tokensEstimated: 75,
      status: "idle",
      langgraphState: {
        delivery_request_id: "deliv_req_9901",
        order_id: "ord_7812",
        pickup_location: [79.8612, 6.9271],
        delivery_location: [79.8722, 6.9385],
        distance_km: 3.4,
        delivery_fee: 3.85,
        retry_count: 0,
        excluded_driver_ids: [],
      },
    },
    {
      id: "deliv-step-2",
      stepNumber: 2,
      title: "Nearby Drivers Searched",
      subtitle: "ToolNode execution via find_nearby_delivery_persons",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "Geospatial radius filter & exclusion list check",
      actionSummary: "Queries active certified couriers within 10 km radius. Filters out any drivers currently engaged in an active delivery run.",
      inputPreview: "Radius: 10.0 km · Kitchen GPS: [6.9271, 79.8612] · Excluded IDs: []",
      outputPreview: "Found 4 available candidate drivers nearby",
      latencyMs: 180,
      tokensEstimated: 210,
      status: "idle",
      langgraphState: {
        raw_candidates_found: 4,
        candidates: [
          { id: "drv_01", name: "Rider Kasun", vehicle: "Electric Bike", distance: 1.2, rating: 4.9, isEco: true },
          { id: "drv_02", name: "Rider Nuwan", vehicle: "Bicycle", distance: 1.8, rating: 4.8, isEco: true },
          { id: "drv_03", name: "Rider Saman", vehicle: "Scooter", distance: 2.6, rating: 4.7, isEco: false },
          { id: "drv_04", name: "Rider Dilshan", vehicle: "EV", distance: 3.5, rating: 4.9, isEco: true },
        ],
      },
      toolDetails: {
        toolName: "find_nearby_delivery_persons",
        arguments: {
          latitude: 6.9271,
          longitude: 79.8612,
          radius_in_kilometers: 10.0,
          excluded_delivery_person_ids: [],
        },
        result: {
          success: true,
          count: 4,
          deliveryPersons: [
            { id: "drv_01", vehicleType: "Electric Bike", distanceInKilometers: 1.2, isAvailable: true },
            { id: "drv_02", vehicleType: "Bicycle", distanceInKilometers: 1.8, isAvailable: true },
          ],
        },
      },
    },
    {
      id: "deliv-step-3",
      stepNumber: 3,
      title: "Driver Candidates Analyzed",
      subtitle: "Google Gemini Proximity & Eco-Bonus Analysis",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "gemini-3.8-flash · Multi-variable scoring",
      actionSummary: "Gemini evaluates candidate proximity (km), estimated pickup ETA, driver reliability rating, and vehicle carbon footprint bonus.",
      inputPreview: "Scoring 4 couriers: distance, ETA, rating, eco-vehicle bonus (+4 pts)",
      outputPreview: "Driver #drv_01 scored 95/100 · Driver #drv_02 scored 89/100",
      latencyMs: 380,
      tokensEstimated: 520,
      status: "idle",
      langgraphState: {
        scored_candidates: [
          { id: "drv_01", name: "Rider Kasun", score: 95, eta: 7, notes: "Ultra-close courier • Zero-emission eco vehicle" },
          { id: "drv_02", name: "Rider Nuwan", score: 89, eta: 9, notes: "Zero-emission eco bicycle • High reliability" },
        ],
      },
      geminiPrompt: `SYSTEM PROMPT: You are the SaveBite Delivery Optimization Agent. Prefer nearby drivers, shorter delivery ETA, and zero-emission vehicles (E-Bike, EV, Bicycle). Never select an unavailable driver.

CANDIDATES:
- drv_01: E-Bike, 1.2km away, 7min ETA, 4.9 rating
- drv_02: Bicycle, 1.8km away, 9min ETA, 4.8 rating
- drv_03: Scooter, 2.6km away, 12min ETA, 4.7 rating`,
      geminiResponse: `THINKING: drv_01 is the closest candidate (1.2 km) with the fastest pickup ETA (7 minutes). Being an Electric Bike qualifies for the SaveBite zero-emission eco bonus (+4 points).
SELECTED: drv_01 with 95% suitability score.`,
    },
    {
      id: "deliv-step-4",
      stepNumber: 4,
      title: "Delivery Options Compared",
      subtitle: "LangGraph State Tradeoff Matrix",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "Tradeoff Analysis & Selection Rationalization",
      actionSummary: "Compares delivery speed vs environmental impact. Synthesizes a transparent decision rationale explaining why the top partner was selected.",
      inputPreview: "Evaluating tradeoff: 1.2km E-Bike vs 2.6km Scooter",
      outputPreview: "Decision confirmed: 1.2km E-Bike provides 40% faster pickup & 0g CO2",
      latencyMs: 290,
      tokensEstimated: 380,
      status: "idle",
      langgraphState: {
        decision_rationale: "AI selected Electric Bike courier with 95% match score based on 1.2 km proximity, 7 min pickup ETA, and zero-emission eco rating.",
        winner_id: "drv_01",
      },
      geminiResponse: `"AI selected Electric Bike courier (Rider Kasun) with a 95% match score based on 1.2 km proximity, 7 min arrival ETA, and 4.9★ reliability rating."`,
    },
    {
      id: "deliv-step-5",
      stepNumber: 5,
      title: "Driver Assigned",
      subtitle: "ToolNode execution via assign_delivery_person",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "assign_delivery_person -> MongoDB & SignalR",
      actionSummary: "Invokes `assign_delivery_person` to bind courier to the delivery request in MongoDB and emits a live SignalR event to the driver's device.",
      inputPreview: "Assign drv_01 to delivery #deliv_req_9901 · Status -> Assigned",
      outputPreview: "✓ Driver Assigned. SignalR notification dispatched to rider device.",
      latencyMs: 210,
      tokensEstimated: 140,
      status: "idle",
      langgraphState: {
        assigned_driver_id: "drv_01",
        status: "Assigned",
        assigned_at: new Date().toISOString(),
      },
      toolDetails: {
        toolName: "assign_delivery_person",
        arguments: {
          delivery_request_id: "deliv_req_9901",
          delivery_person_id: "drv_01",
        },
        result: {
          success: true,
          status: "Assigned",
          message: "Driver assigned successfully and notified.",
        },
      },
    },
    {
      id: "deliv-step-6-accept",
      stepNumber: 6,
      title: "Driver Accepted",
      subtitle: "Happy Path: SignalR DriverAccepted -> LangGraph END",
      technology: "SignalR Hub",
      techBadgeClass: "adm-tech-signalr",
      techDetail: "Hub: /hubs/delivery -> DriverAccepted Event",
      actionSummary: "Courier confirms dispatch request via mobile app within the 60-second window. Status updates to `Accepted`. Workflow completes successfully.",
      inputPreview: "SignalR Event: DriverAccepted received for #deliv_req_9901",
      outputPreview: "✓ Order in transit preparation. Delivery confirmed by courier.",
      latencyMs: 95,
      tokensEstimated: 50,
      status: "idle",
      langgraphState: {
        status: "Accepted",
        terminal_node: "END",
        message: "Autonomous delivery partner successfully secured on first dispatch.",
      },
    },
  ];

  // Define Steps for Delivery Agent: REJECTION & RETRY (Self-Healing Loop)
  const deliveryRejectedNodes: TimelineNode[] = [
    ...deliveryAcceptedNodes.slice(0, 5),
    {
      id: "deliv-step-6-reject",
      stepNumber: 6,
      title: "Driver Rejected → Self-Healing Retry",
      subtitle: "Driver Declines -> Rejection Recovery Loop triggered",
      technology: "SignalR Hub",
      techBadgeClass: "adm-tech-signalr",
      techDetail: "SignalR DeliveryRejected -> /agents/delivery/retry",
      actionSummary: "Driver declines dispatch or acceptance window expires. SignalR dispatches `DeliveryRejected` and triggers `/agents/delivery/retry`.",
      inputPreview: "Driver #drv_01 rejected · Added to excluded_driver_ids · retry_count = 1",
      outputPreview: "⚡ Self-healing loop activated: Re-evaluating candidate pool",
      latencyMs: 120,
      tokensEstimated: 60,
      status: "idle",
      langgraphState: {
        status: "Searching",
        rejected_driver_id: "drv_01",
        excluded_driver_ids: ["drv_01"],
        retry_count: 1,
        max_retries: 3,
      },
    },
    {
      id: "deliv-step-7-reassign",
      stepNumber: 7,
      title: "Backup Courier Re-Assigned (Self-Healed)",
      subtitle: "LangGraph loops back: Next best candidate selected & assigned",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "Autonomous Retry Cycle -> drv_02 Assigned",
      actionSummary: "Gemini filters out previous driver #drv_01, analyzes next best candidate (Rider Nuwan, Bicycle, 89% fit), and autonomously re-assigns.",
      inputPreview: "Excluded: [drv_01] · Winner: drv_02 (Rider Nuwan, Bicycle)",
      outputPreview: "✓ Success: Backup courier assigned without human intervention.",
      latencyMs: 440,
      tokensEstimated: 410,
      status: "idle",
      langgraphState: {
        status: "Assigned",
        assigned_driver_id: "drv_02",
        retry_count: 1,
        message: "AI agent automatically recovered from rejection and assigned next-best partner (Rider Nuwan).",
      },
      geminiResponse: `"Primary courier declined dispatch. LangGraph agent re-evaluated remaining candidates, excluding previous driver. Selected Rider Nuwan (89% match score) for immediate re-assignment."`,
    },
  ];

  // Route Optimization Agent Nodes (10 Graph Nodes)
  const routeNodes: TimelineNode[] = [
    {
      id: "route-step-1",
      stepNumber: 1,
      title: "Observe Delivery Request",
      subtitle: "LangGraph START node initialization",
      technology: "LangGraph",
      techBadgeClass: "adm-tech-langgraph",
      techDetail: "StateGraph START -> RouteAgentState",
      actionSummary: "Agent observes order pickup location (Kitchen) and destination delivery coordinates.",
      inputPreview: "DeliveryRequestId: 'del_req_482' · Origin: [40.7128, -74.0060] · Destination: [40.7484, -73.9857]",
      outputPreview: "RouteAgentState initialized with coordinates and order metadata",
      latencyMs: 14,
      tokensEstimated: 75,
      status: "idle",
      langgraphState: {
        delivery_request_id: "del_req_482",
        order_id: "ord_1028",
        pickup_latitude: 40.7128,
        pickup_longitude: -74.0060,
        destination_latitude: 40.7484,
        destination_longitude: -73.9857,
      },
    },
    {
      id: "route-step-2",
      stepNumber: 2,
      title: "Get Driver GPS Location",
      subtitle: "ToolNode execution via get_driver_location",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "StructuredTool -> C# REST API / MongoDB",
      actionSummary: "Retrieves courier's latest verified GPS position and heading vector.",
      inputPreview: "delivery_request_id = 'del_req_482'",
      outputPreview: "Driver coordinates: [40.7135, -74.0050] (Bicycle)",
      latencyMs: 65,
      tokensEstimated: 80,
      status: "idle",
      langgraphState: {
        driver_latitude: 40.7135,
        driver_longitude: -74.0050,
      },
      toolDetails: {
        toolName: "get_driver_location",
        arguments: { delivery_request_id: "del_req_482" },
        result: { success: true, latitude: 40.7135, longitude: -74.0050, isSimulated: false },
      },
    },
    {
      id: "route-step-3",
      stepNumber: 3,
      title: "Retrieve Candidate Routes",
      subtitle: "ToolNode execution via get_route_options",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "IRoutingProvider -> 3 Multi-Path Candidates",
      actionSummary: "Queries abstracted routing provider for verified route alternatives (Route A, Route B, Route C).",
      inputPreview: "Origin: [40.7135, -74.0050] · Destination: [40.7484, -73.9857]",
      outputPreview: "3 verified routes: Route A (3.1km), Route B (4.0km), Route C (5.2km)",
      latencyMs: 210,
      tokensEstimated: 190,
      status: "idle",
      langgraphState: {
        candidate_count: 3,
        candidates: ["route-A", "route-B", "route-C"],
      },
      toolDetails: {
        toolName: "get_route_options",
        arguments: { origin_latitude: 40.7135, origin_longitude: -74.0050, destination_latitude: 40.7484, destination_longitude: -73.9857 },
        result: {
          routes: [
            { routeId: "route-A", name: "Central Avenue Direct", distanceInKilometers: 3.1, normalDurationMinutes: 10, trafficDurationMinutes: 22 },
            { routeId: "route-B", name: "Westside Arterial Bypass", distanceInKilometers: 4.0, normalDurationMinutes: 13, trafficDurationMinutes: 14 },
            { routeId: "route-C", name: "East River Perimeter Loop", distanceInKilometers: 5.2, normalDurationMinutes: 16, trafficDurationMinutes: 16 },
          ],
        },
      },
    },
    {
      id: "route-step-4",
      stepNumber: 4,
      title: "Analyze Current Traffic",
      subtitle: "ToolNode execution via get_current_traffic",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "Traffic Flow API -> Congestion metrics",
      actionSummary: "Calculates congestion delay factors across corridor segments.",
      inputPreview: "Origin & Destination bounding box",
      outputPreview: "Traffic Level: Heavy · Bottleneck: Central Metro Crossing (+12m delay on Route A)",
      latencyMs: 120,
      tokensEstimated: 110,
      status: "idle",
      langgraphState: {
        traffic_information: {
          overallTrafficLevel: "Heavy",
          congestionFactor: 1.6,
          averageDelayMinutes: 8.5,
          bottleneckArea: "Central Metro Crossing",
        },
      },
      toolDetails: {
        toolName: "get_current_traffic",
        arguments: { origin_latitude: 40.7135, destination_latitude: 40.7484 },
        result: { overallTrafficLevel: "Heavy", congestionFactor: 1.6, bottleneckArea: "Central Metro Crossing" },
      },
    },
    {
      id: "route-step-5",
      stepNumber: 5,
      title: "Load Historical Route Data",
      subtitle: "ToolNode execution via get_historical_route_data",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "MongoDB routeHistory aggregation pipeline",
      actionSummary: "Aggregates past delivery durations, delay variance, and success rate for each candidate.",
      inputPreview: "Collection: routeHistory",
      outputPreview: "Route A: 88% reliability, +8m delay | Route B: 97% reliability, +1.4m delay",
      latencyMs: 145,
      tokensEstimated: 140,
      status: "idle",
      langgraphState: {
        historical_routes: [
          { routeId: "route-A", historicalAverageMinutes: 18.5, successfulDeliveryRate: 0.88 },
          { routeId: "route-B", historicalAverageMinutes: 14.2, successfulDeliveryRate: 0.97 },
          { routeId: "route-C", historicalAverageMinutes: 16.8, successfulDeliveryRate: 0.95 },
        ],
      },
      toolDetails: {
        toolName: "get_historical_route_data",
        arguments: { origin_latitude: 40.7135, destination_latitude: 40.7484 },
        result: {
          historicalRoutes: [
            { routeId: "route-A", historicalAverageMinutes: 18.5, historicalDelayMinutes: 8.2, successfulDeliveryRate: 0.88 },
            { routeId: "route-B", historicalAverageMinutes: 14.2, historicalDelayMinutes: 1.4, successfulDeliveryRate: 0.97 },
          ],
        },
      },
    },
    {
      id: "route-step-6",
      stepNumber: 6,
      title: "Deterministic Route Scoring",
      subtitle: "Multi-factor objective scoring calculation",
      technology: "LangGraph",
      techBadgeClass: "adm-tech-langgraph",
      techDetail: "Deterministic formula: Time(40%) + Traffic(25%) + Reliability(25%) + Distance(10%)",
      actionSummary: "Calculates numeric score for each candidate to prevent hallucinated scoring.",
      inputPreview: "3 Candidate route profiles + Historical statistics",
      outputPreview: "Scores: Route B (88.5 pts) > Route C (72.1 pts) > Route A (54.3 pts)",
      latencyMs: 8,
      tokensEstimated: 95,
      status: "idle",
      langgraphState: {
        scored_candidates: [
          { routeId: "route-B", score: 88.5, duration: 14 },
          { routeId: "route-C", score: 72.1, duration: 16 },
          { routeId: "route-A", score: 54.3, duration: 22 },
        ],
      },
    },
    {
      id: "route-step-7",
      stepNumber: 7,
      title: "Gemini Route Trade-off Reasoning",
      subtitle: "LLM trade-off evaluation & explanation",
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: "gemini-3.8-flash -> Structured JSON Decision",
      actionSummary: "Gemini reasons over arrival time guarantees, traffic bottleneck risks, and historical reliability.",
      inputPreview: "Prompt: Compare Route A (3.1km, 22min) vs Route B (4.0km, 14min, 97% rel).",
      outputPreview: "Decision: Route B | Reason: Lowest expected arrival delay despite longer distance.",
      latencyMs: 460,
      tokensEstimated: 380,
      status: "idle",
      langgraphState: {
        selected_route_id: "route-B",
        confidence: 0.94,
      },
      geminiPrompt: `Select the best overall route for fast, reliable delivery.
Route A: 3.1 km, normal 10 min, traffic delay +12 min (Total 22 min), historical reliability 88%.
Route B: 4.0 km, normal 13 min, traffic delay +1 min (Total 14 min), historical reliability 97%.
Route C: 5.2 km, normal 16 min, traffic delay 0 min (Total 16 min), historical reliability 95%.`,
      geminiResponse: `{
  "selectedRouteId": "route-B",
  "reason": "Route B provides the fastest reliable arrival time (14 min vs 22 min on Route A) by bypassing heavy central corridor congestion, backed by 97% historical delivery reliability.",
  "confidence": 0.94
}`,
    },
    {
      id: "route-step-8",
      stepNumber: 8,
      title: "Route Validation Gate",
      subtitle: "Deterministic candidate verification",
      technology: "LangGraph",
      techBadgeClass: "adm-tech-langgraph",
      techDetail: "State validation node",
      actionSummary: "Validates that Gemini's selectedRouteId strictly matches a verified candidate from the routing provider.",
      inputPreview: "selectedRouteId = 'route-B'",
      outputPreview: "Validated: 'route-B' verified against candidate pool",
      latencyMs: 6,
      tokensEstimated: 40,
      status: "idle",
      langgraphState: {
        validation_passed: true,
        selected_route: "route-B",
      },
    },
    {
      id: "route-step-9",
      stepNumber: 9,
      title: "Save Route Version to MongoDB",
      subtitle: "ToolNode execution via save_selected_route",
      technology: "LangGraph Tool",
      techBadgeClass: "adm-tech-tool",
      techDetail: "MongoDB deliveryRoutes collection",
      actionSummary: "Stores selected route geometry, waypoints, alternative routes, and increments routeVersion.",
      inputPreview: "Collection: deliveryRoutes · Version: 2",
      outputPreview: "Route saved: version 2, polyline with 9 waypoints",
      latencyMs: 110,
      tokensEstimated: 90,
      status: "idle",
      langgraphState: {
        route_version: 2,
        saved_status: "Inserted",
      },
      toolDetails: {
        toolName: "save_selected_route",
        arguments: { orderId: "ord_1028", routeId: "route-B", estimatedMinutes: 14, routeVersion: 2 },
        result: { success: true, routeVersion: 2 },
      },
    },
    {
      id: "route-step-10",
      stepNumber: 10,
      title: "SignalR Live Map Broadcast",
      subtitle: "Real-time delivery group dispatch",
      technology: "SignalR Hub",
      techBadgeClass: "adm-tech-signalr",
      techDetail: "IHubContext<DeliveryHub> -> delivery-{orderId}",
      actionSummary: "Broadcasts RouteUpdated, ETAUpdated, and RouteRecalculationCompleted to customer and courier apps.",
      inputPreview: "Group: delivery-ord_1028 · Events: RouteUpdated, ETAUpdated",
      outputPreview: "Customer & Courier maps transitioned to Route B seamlessly",
      latencyMs: 32,
      tokensEstimated: 60,
      status: "idle",
      langgraphState: {
        broadcast_events: ["RouteUpdated", "ETAUpdated", "RouteRecalculationCompleted"],
        delivery_group: "delivery-ord_1028",
      },
    },
  ];

  // Pick current nodes depending on agent and branch
  const currentNodes =
    activeAgent === "food"
      ? foodNodes
      : activeAgent === "route"
      ? routeNodes
      : deliveryBranch === "accepted"
      ? deliveryAcceptedNodes
      : deliveryRejectedNodes;

  // Clear animation timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Playback Loop
  const handleStartDemo = () => {
    if (playbackState === "playing") return;

    if (playbackState === "completed" || activeStepIndex >= currentNodes.length - 1) {
      setActiveStepIndex(0);
    } else if (activeStepIndex === -1) {
      setActiveStepIndex(0);
    }

    setPlaybackState("playing");

    const intervalTime = Math.max(700, 2000 / playbackSpeed);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setActiveStepIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= currentNodes.length) {
          clearInterval(timerRef.current);
          setPlaybackState("completed");
          return currentNodes.length - 1;
        }
        return nextIndex;
      });
    }, intervalTime);
  };

  const handlePauseDemo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaybackState("paused");
  };

  const handleNextStep = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaybackState("paused");
    setActiveStepIndex((prev) => {
      const next = prev + 1;
      if (next >= currentNodes.length - 1) {
        setPlaybackState("completed");
        return currentNodes.length - 1;
      }
      return next;
    });
  };

  const handleResetDemo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaybackState("idle");
    setActiveStepIndex(-1);
    setSelectedNode(null);
  };

  // Inspect node
  const handleInspectNode = (node: TimelineNode) => {
    setSelectedNode(node);
    if (node.geminiPrompt) {
      setActiveDrawerTab("gemini");
    } else if (node.toolDetails) {
      setActiveDrawerTab("tool");
    } else {
      setActiveDrawerTab("state");
    }
  };

  // Trigger retry optimization from database table
  const handleRetryOptimization = async (deliveryRequestId: string) => {
    try {
      setOptimizingId(deliveryRequestId);
      await retryAIOptimization(deliveryRequestId);
      setMessage({
        text: `✓ Autonomous AI Agent re-dispatched for delivery #${deliveryRequestId.slice(-6)}.`,
        type: "success",
      });
      await loadActivity();
    } catch (err) {
      setMessage({
        text: "Failed to trigger AI optimization retry.",
        type: "error",
      });
    } finally {
      setOptimizingId(null);
    }
  };

  // Load a real MongoDB trace into timeline
  const handleInspectHistoricalTrace = (act: AdminAIActivity) => {
    setSelectedHistoricalActivity(act);
    setActiveAgent("delivery");
    setActiveStepIndex(4); // Highlight driver assigned
    setSelectedNode({
      id: `real-${act.id}`,
      stepNumber: 5,
      title: `Real Dispatch: #${act.id.slice(-6)}`,
      subtitle: `Kitchen: ${act.restaurantName}`,
      technology: "Google Gemini",
      techBadgeClass: "adm-tech-gemini",
      techDetail: `Suitability: ${act.candidateScore}% · Vehicle: ${act.vehicleType}`,
      actionSummary: act.decisionRationale,
      inputPreview: `Order #${act.orderId?.slice(-6) || "N/A"} · Distance: ${act.distanceInKilometers} km · Fee: $${act.deliveryFee}`,
      outputPreview: `Courier: ${act.selectedCourier} · Status: ${act.status}`,
      latencyMs: 340,
      tokensEstimated: 460,
      status: "completed",
      langgraphState: {
        delivery_id: act.id,
        order_id: act.orderId,
        restaurant: act.restaurantName,
        assigned_driver: act.selectedCourier,
        vehicle: act.vehicleType,
        score: act.candidateScore,
        status: act.status,
      },
      geminiResponse: act.decisionRationale,
    });
    // Scroll smoothly to timeline
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  return (
    <div className="adm-ai-page">
      {/* PAGE HEADER */}
      <div className="adm-page-header">
        <div>
          <div className="adm-badge-live">
            <span className="adm-pulse-dot" /> AGENTIC AI OBSERVABILITY & DEMONSTRATION
          </div>
          <h1 className="adm-page-title">LangGraph & Google Gemini AI Activity Monitor</h1>
          <p className="adm-page-subtitle">
            Demonstrate autonomous agent execution, multi-criteria reasoning, tool invocation loops, and self-healing retries with animated timeline cards.
          </p>
        </div>
        <div className="adm-header-actions">
          <button onClick={loadActivity} className="adm-btn-secondary">
            🔄 Refresh Live Feed
          </button>
        </div>
      </div>

      {message && (
        <div className={`adm-alert-banner ${message.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="adm-alert-close">×</button>
        </div>
      )}

      {/* EVALUATOR ARCHITECTURE SUMMARY CALLOUT */}
      <div className="adm-card adm-evaluator-card">
        <div className="adm-evaluator-header" onClick={() => setArchSummaryOpen(!archSummaryOpen)}>
          <div className="adm-evaluator-title">
            <span className="adm-evaluator-icon">🎓</span>
            <div>
              <h3>Lecturer & Evaluator Architecture Summary</h3>
              <p>How SaveBite combines LangGraph StateGraphs and Google Gemini (gemini-3.8-flash)</p>
            </div>
          </div>
          <button className="adm-btn-icon-subtle">{archSummaryOpen ? "▲ Collapse" : "▼ Expand"}</button>
        </div>

        {archSummaryOpen && (
          <div className="adm-evaluator-body">
            <div className="adm-evaluator-grid">
              <div className="adm-evaluator-col">
                <div className="adm-evaluator-col-tag adm-tag-purple">🧠 LangGraph Role (Orchestration)</div>
                <ul>
                  <li><strong>Cyclic StateGraph</strong>: Implements stateful agent loops (<code>agent_node</code> ↔ <code>ToolNode</code>) until stopping condition is reached.</li>
                  <li><strong>Conditional Edge Routing</strong>: <code>route_after_agent</code> inspects <code>tool_calls</code> to dynamically execute tools or conclude at <code>END</code>.</li>
                  <li><strong>Self-Healing Recovery</strong>: In delivery rejection, StateGraph retains <code>excluded_driver_ids</code> and increments <code>retry_count</code> to loop back to candidate evaluation.</li>
                </ul>
              </div>

              <div className="adm-evaluator-col">
                <div className="adm-evaluator-col-tag adm-tag-gemini">✨ Google Gemini Role (Reasoning)</div>
                <ul>
                  <li><strong>Model</strong>: <code>gemini-3.8-flash</code> with structured thinking mode enabled via LangChain.</li>
                  <li><strong>Multi-Criteria Scoring</strong>: Evaluates distance, ETA, courier rating, and zero-emission vehicle bonuses (+4 pts for E-Bike/EV).</li>
                  <li><strong>Personalized Synthesis</strong>: Translates raw database entities into human-readable match explanations and priority badges.</li>
                </ul>
              </div>

              <div className="adm-evaluator-col">
                <div className="adm-evaluator-col-tag adm-tag-signalr">⚡ C# .NET & SignalR Role (Runtime)</div>
                <ul>
                  <li><strong>Real-Time Synchronization</strong>: <code>/hubs/delivery</code> hub pushes live events (<code>DriverAssigned</code>, <code>DriverAccepted</code>, <code>DeliveryRejected</code>).</li>
                  <li><strong>Persistence</strong>: Stores state and geospatial coordinates in MongoDB Atlas with 2D sphere indexes.</li>
                  <li><strong>Telemetry</strong>: Exposes REST APIs connecting AI agents with business entities.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AGENT TOGGLE BAR */}
      <div className="adm-agent-selector-bar">
        <div className="adm-agent-tabs">
          <button
            className={`adm-agent-tab ${activeAgent === "food" ? "active" : ""}`}
            onClick={() => {
              setActiveAgent("food");
              handleResetDemo();
            }}
          >
            <span className="adm-agent-tab-icon">🍽️</span>
            <div>
              <div className="adm-agent-tab-title">Food Matching Agent</div>
              <div className="adm-agent-tab-sub">Customer request → Profile → Nearby search → Gemini analysis → Recommendations</div>
            </div>
            <span className="adm-agent-pill">5 Graph Nodes</span>
          </button>

          <button
            className={`adm-agent-tab ${activeAgent === "delivery" ? "active" : ""}`}
            onClick={() => {
              setActiveAgent("delivery");
              handleResetDemo();
            }}
          >
            <span className="adm-agent-tab-icon">🛵</span>
            <div>
              <div className="adm-agent-tab-title">Autonomous Delivery Agent</div>
              <div className="adm-agent-tab-sub">Delivery request → Driver search → Tradeoffs → Assign → Accept / Rejection loop</div>
            </div>
            <span className="adm-agent-pill">6-7 Graph Nodes</span>
          </button>

          <button
            className={`adm-agent-tab ${activeAgent === "route" ? "active" : ""}`}
            onClick={() => {
              setActiveAgent("route");
              handleResetDemo();
            }}
          >
            <span className="adm-agent-tab-icon">🗺️</span>
            <div>
              <div className="adm-agent-tab-title">Route Optimization Agent</div>
              <div className="adm-agent-tab-sub">GPS position → Alternative routes → Live traffic → Historical reliability → Gemini trade-offs → Versioned broadcast</div>
            </div>
            <span className="adm-agent-pill">10 Graph Nodes</span>
          </button>
        </div>

        {/* SECTION 19 — ROUTE OPTIMIZATION PANEL */}
        {activeAgent === "route" && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(31, 41, 55, 0.95))",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "12px",
              padding: "20px",
              marginTop: "16px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "26px" }}>🛰️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#10b981", fontWeight: "bold" }}>
                    Autonomous Route Optimization & Monitoring Panel
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                    Live corridor surveillance. Triggers LangGraph recalculation when traffic delay changes &gt; 20% or ETA increases &gt; 5 mins.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-btn-secondary"
                style={{ background: "#10b981", color: "#000", fontWeight: "bold", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
                onClick={handleStartDemo}
              >
                ▶ Run Route Optimization Graph
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                background: "rgba(17, 24, 39, 0.85)",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #374151",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Order</span>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#f9fafb" }}>Order #1028</div>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>Courier: Bicycle</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Previous Route</span>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#ef4444" }}>Route A (Direct)</div>
                <span style={{ fontSize: "11px", color: "#ef4444" }}>Bottleneck: +12m delay</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Current Route</span>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#10b981" }}>Route B (Arterial)</div>
                <span style={{ fontSize: "11px", color: "#10b981" }}>97% reliability score</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Traffic</span>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#f59e0b" }}>Heavy Corridor</div>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>Inner Avenue delayed</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>ETA</span>
                <div style={{ fontSize: "17px", fontWeight: "bold", color: "#10b981" }}>14 minutes</div>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>4.0 km remaining</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Recalculations</span>
                <div style={{ fontSize: "17px", fontWeight: "bold", color: "#f9fafb" }}>2 Versions</div>
                <span style={{ fontSize: "11px", color: "#10b981" }}>SignalR broadcasted</span>
              </div>
            </div>

            <div style={{ marginTop: "12px", fontSize: "12px", color: "#d1d5db" }}>
              <strong>Reason:</strong> "Route B currently has lower expected delay and 97% reliability under current heavy congestion."
            </div>
          </div>
        )}

        {/* DELIVERY BRANCH TOGGLE (When Delivery Agent is selected) */}
        {activeAgent === "delivery" && (
          <div className="adm-branch-toggle-box">
            <span className="adm-branch-label">Execution Scenario:</span>
            <div className="adm-branch-buttons">
              <button
                className={`adm-branch-btn ${deliveryBranch === "accepted" ? "active-green" : ""}`}
                onClick={() => {
                  setDeliveryBranch("accepted");
                  handleResetDemo();
                }}
              >
                ✓ Happy Path (Driver Accepted)
              </button>
              <button
                className={`adm-branch-btn ${deliveryBranch === "rejected" ? "active-amber" : ""}`}
                onClick={() => {
                  setDeliveryBranch("rejected");
                  handleResetDemo();
                }}
              >
                ⚡ Self-Healing Loop (Driver Rejected → Retry)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LIVE SIMULATION CONTROLS */}
      <div className="adm-card adm-controls-card">
        <div className="adm-controls-left">
          <div className="adm-controls-title">
            <span className="adm-sim-icon">🎮</span>
            <strong>Interactive Demonstration Engine</strong>
            <span className={`adm-playback-badge adm-playback-${playbackState}`}>
              {playbackState === "playing" ? "● RUNNING" : playbackState === "paused" ? "❚❚ PAUSED" : playbackState === "completed" ? "✓ COMPLETED" : "○ READY"}
            </span>
          </div>
          <div className="adm-controls-sub">
            Step {Math.max(0, activeStepIndex + 1)} of {currentNodes.length} ·{" "}
            {activeStepIndex >= 0 ? currentNodes[activeStepIndex]?.title : "Click 'Start Live Demo' to animate graph execution"}
          </div>
        </div>

        <div className="adm-controls-actions">
          {playbackState !== "playing" ? (
            <button onClick={handleStartDemo} className="adm-btn-primary adm-btn-play">
              ▶️ {playbackState === "paused" ? "Resume Demo" : playbackState === "completed" ? "Re-Run Demo" : "Start Live Demo"}
            </button>
          ) : (
            <button onClick={handlePauseDemo} className="adm-btn-secondary">
              ❚❚ Pause Demo
            </button>
          )}

          <button onClick={handleNextStep} disabled={playbackState === "playing" || activeStepIndex >= currentNodes.length - 1} className="adm-btn-secondary">
            ⏭️ Next Step
          </button>

          <button onClick={handleResetDemo} className="adm-btn-secondary">
            🔄 Reset
          </button>

          <div className="adm-speed-selector">
            <span className="adm-speed-label">Speed:</span>
            {[1, 1.5, 2].map((s) => (
              <button
                key={s}
                className={`adm-speed-btn ${playbackSpeed === s ? "active" : ""}`}
                onClick={() => setPlaybackSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TIMELINE PROGRESS BAR */}
      <div className="adm-timeline-progress-track">
        <div
          className="adm-timeline-progress-fill"
          style={{
            width: activeStepIndex >= 0 ? `${((activeStepIndex + 1) / currentNodes.length) * 100}%` : "0%",
          }}
        />
      </div>

      {/* ANIMATED TIMELINE CARDS */}
      <div className="adm-timeline-container">
        <div className="adm-timeline-header-info">
          <h3>
            {activeAgent === "food" ? "🍽️ Food Matching Agent Execution Graph" : "🛵 Delivery Coordination Agent Execution Graph"}
          </h3>
          <span className="adm-timeline-hint">
            💡 Click any card to inspect full LangGraph state, Google Gemini prompt context, and tool payloads.
          </span>
        </div>

        <div className="adm-timeline-grid">
          {currentNodes.map((node, index) => {
            const isCompleted = activeStepIndex > index || playbackState === "completed";
            const isActive = activeStepIndex === index && playbackState !== "completed";
            const isPending = activeStepIndex < index && playbackState !== "completed";
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                className={`adm-timeline-card ${isActive ? "adm-card-active" : ""} ${isCompleted ? "adm-card-completed" : ""} ${isPending ? "adm-card-pending" : ""} ${isSelected ? "adm-card-selected" : ""}`}
                onClick={() => handleInspectNode(node)}
              >
                {/* CONNECTOR LINE TO NEXT NODE */}
                {index < currentNodes.length - 1 && (
                  <div className={`adm-timeline-connector ${isCompleted ? "connector-completed" : isActive ? "connector-active" : ""}`}>
                    <span className="adm-connector-arrow">→</span>
                  </div>
                )}

                {/* SPECIAL RETRY LOOPBACK ARROW ON REJECTION STEP */}
                {node.id === "deliv-step-6-reject" && (
                  <div className="adm-retry-loopback-indicator">
                    <span>↺ Loops back to Step 2 with excluded_driver_ids</span>
                  </div>
                )}

                {/* STEP BADGE & STATUS */}
                <div className="adm-timeline-card-top">
                  <div className="adm-step-number-pill">
                    {isCompleted ? "✓" : node.stepNumber}
                  </div>
                  <span className={`adm-tech-badge ${node.techBadgeClass}`}>
                    {node.technology}
                  </span>
                  <div className="adm-latency-pill">⏱️ {node.latencyMs}ms</div>
                </div>

                {/* TITLE & DESCRIPTION */}
                <h4 className="adm-timeline-card-title">{node.title}</h4>
                <p className="adm-timeline-card-sub">{node.subtitle}</p>

                <div className="adm-timeline-action-box">
                  <p>{node.actionSummary}</p>
                </div>

                {/* PAYLOAD SNIPPETS */}
                <div className="adm-timeline-io-box">
                  <div className="adm-io-row">
                    <span className="adm-io-tag">Input:</span>
                    <span className="adm-io-text">{node.inputPreview}</span>
                  </div>
                  <div className="adm-io-row">
                    <span className="adm-io-tag adm-io-tag-out">Output:</span>
                    <span className="adm-io-text">{node.outputPreview}</span>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="adm-timeline-card-footer">
                  <span className="adm-tech-detail-text">{node.techDetail}</span>
                  <button
                    type="button"
                    className="adm-btn-inspect"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspectNode(node);
                    }}
                  >
                    🔍 Telemetry
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INSPECTABLE NODE TELEMETRY DRAWER / MODAL */}
      {selectedNode && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="adm-modal-content adm-telemetry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <span className={`adm-tech-badge ${selectedNode.techBadgeClass}`} style={{ marginBottom: "6px" }}>
                  {selectedNode.technology} · Step {selectedNode.stepNumber}
                </span>
                <h3 className="adm-modal-title">{selectedNode.title}</h3>
                <p className="adm-table-cell-sub">{selectedNode.subtitle}</p>
              </div>
              <button className="adm-modal-close" onClick={() => setSelectedNode(null)}>×</button>
            </div>

            {/* DRAWER TABS */}
            <div className="adm-telemetry-tabs">
              <button
                className={`adm-telemetry-tab ${activeDrawerTab === "state" ? "active" : ""}`}
                onClick={() => setActiveDrawerTab("state")}
              >
                🧠 LangGraph State Schema
              </button>
              {selectedNode.geminiPrompt && (
                <button
                  className={`adm-telemetry-tab ${activeDrawerTab === "gemini" ? "active" : ""}`}
                  onClick={() => setActiveDrawerTab("gemini")}
                >
                  ✨ Google Gemini Context
                </button>
              )}
              {selectedNode.toolDetails && (
                <button
                  className={`adm-telemetry-tab ${activeDrawerTab === "tool" ? "active" : ""}`}
                  onClick={() => setActiveDrawerTab("tool")}
                >
                  🛠️ Tool Payload (JSON)
                </button>
              )}
            </div>

            <div className="adm-modal-body">
              {/* TAB 1: LANGGRAPH STATE */}
              {activeDrawerTab === "state" && (
                <div className="adm-code-block-container">
                  <div className="adm-code-header">
                    <span>LangGraph State Snapshot (Python Dict / JSON)</span>
                    <span className="adm-code-tokens">Est. Tokens: {selectedNode.tokensEstimated}</span>
                  </div>
                  <pre className="adm-code-pre">
                    <code>{JSON.stringify(selectedNode.langgraphState, null, 2)}</code>
                  </pre>
                </div>
              )}

              {/* TAB 2: GOOGLE GEMINI CONTEXT */}
              {activeDrawerTab === "gemini" && (
                <div className="adm-gemini-telemetry-box">
                  <div className="adm-gemini-section">
                    <h4>Prompt & System Instructions (Sent to gemini-3.8-flash)</h4>
                    <pre className="adm-code-pre adm-code-prompt">
                      <code>{selectedNode.geminiPrompt || "N/A"}</code>
                    </pre>
                  </div>

                  <div className="adm-gemini-section" style={{ marginTop: "16px" }}>
                    <h4>Gemini Structured Thinking & Output</h4>
                    <div className="adm-gemini-response-callout">
                      {selectedNode.geminiResponse}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TOOL DETAILS */}
              {activeDrawerTab === "tool" && selectedNode.toolDetails && (
                <div className="adm-tool-telemetry-box">
                  <div className="adm-tool-header">
                    <strong>Invoked Tool:</strong> <code>{selectedNode.toolDetails.toolName}</code>
                  </div>

                  <div className="adm-code-header" style={{ marginTop: "12px" }}>
                    <span>Input Arguments</span>
                  </div>
                  <pre className="adm-code-pre">
                    <code>{JSON.stringify(selectedNode.toolDetails.arguments, null, 2)}</code>
                  </pre>

                  <div className="adm-code-header" style={{ marginTop: "12px" }}>
                    <span>Execution Result</span>
                  </div>
                  <pre className="adm-code-pre">
                    <code>{JSON.stringify(selectedNode.toolDetails.result, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>

            <div className="adm-modal-footer">
              <button className="adm-btn-secondary" onClick={() => setSelectedNode(null)}>
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-WORLD DATABASE DISPATCHES TABLE */}
      <div className="adm-card" style={{ marginTop: "32px" }}>
        <div className="adm-card-header">
          <div>
            <h3 className="adm-card-title">Real-World Execution Traces (MongoDB Database)</h3>
            <p className="adm-table-cell-sub">
              Actual autonomous delivery dispatches recorded live. Click "Inspect in Timeline" to load real traces into the visualizer above.
            </p>
          </div>
          <span className="adm-counter-badge">{activities.length} Recorded Traces</span>
        </div>

        {loading ? (
          <div className="adm-loading-state">
            <div className="adm-spinner" />
            <p>Fetching real execution traces from MongoDB Atlas...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="adm-empty-table-state">
            <span className="adm-empty-icon">🤖</span>
            <h4>No real delivery requests yet</h4>
            <p>Orders reaching "ReadyForPickup" will automatically populate real-world dispatch records here.</p>
          </div>
        ) : (
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Delivery</th>
                  <th>Origin Kitchen</th>
                  <th>Decision Rationale</th>
                  <th>Selected Courier</th>
                  <th>Suitability</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className={selectedHistoricalActivity?.id === a.id ? "adm-tr-highlight" : ""}>
                    <td>
                      <span className="adm-id-code" title={a.id}>#{a.id.slice(-6)}</span>
                      <div className="adm-table-cell-sub">{a.distanceInKilometers.toFixed(1)} km</div>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{a.restaurantName}</div>
                    </td>
                    <td style={{ maxWidth: "280px" }}>
                      <div className="adm-ai-rationale">{a.decisionRationale}</div>
                    </td>
                    <td>
                      <div className="adm-font-bold">{a.selectedCourier}</div>
                      <div className="adm-table-cell-sub">Vehicle: {a.vehicleType}</div>
                    </td>
                    <td>
                      <div className="adm-score-bar-container">
                        <div
                          className="adm-score-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(20, a.candidateScore))}%` }}
                        />
                      </div>
                      <span className="adm-score-text">{a.candidateScore}% Fit</span>
                    </td>
                    <td>
                      <span className={`adm-status-pill adm-status-${a.status.toLowerCase()}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div className="adm-action-buttons-cell">
                        <button
                          onClick={() => handleInspectHistoricalTrace(a)}
                          className="adm-btn-inspect-trace"
                          title="Load this real dispatch into the animated timeline above"
                        >
                          📈 Inspect
                        </button>
                        {a.status === "Searching" && (
                          <button
                            onClick={() => handleRetryOptimization(a.id)}
                            disabled={optimizingId === a.id}
                            className="adm-btn-action-retry"
                            title="Re-trigger autonomous dispatch"
                          >
                            {optimizingId === a.id ? "..." : "⚡ Retry"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAIActivityPage;
