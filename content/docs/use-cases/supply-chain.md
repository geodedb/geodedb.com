---
title: "Supply Chain Optimization"
description: "Optimize supply chain operations with Geode: route planning, inventory tracking, supplier networks, and real-time logistics analytics"
url: /docs/use-cases/supply-chain/
keywords: ["supply chain", "logistics", "route optimization", "inventory management", "shortest path", "Dijkstra", "network analysis", "warehouse management", "delivery tracking"]
weight: 60
slug: "supply-chain"
canonical: "https://geodedb.com/docs/use-cases/supply-chain/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Supply Chain Optimization

Optimize supply chain operations with Geode for route planning, inventory tracking, and real-time logistics analytics.

## Overview

Supply chain networks are inherently graph-structured with warehouses, distribution centers, suppliers, and customers connected by transportation routes. Geode provides efficient path finding, network analysis, and real-time tracking capabilities.

### Key Capabilities

- **Route Optimization**: Find shortest/cheapest paths for deliveries
- **Inventory Tracking**: Monitor stock levels across network
- **Supplier Network Analysis**: Identify dependencies and risks
- **Real-Time Logistics**: Track shipments and update ETAs
- **Bottleneck Detection**: Find congestion points in network
- **Multi-Modal Transport**: Optimize across truck/rail/ship/air

## Use Case Scenarios

### 1. Last-Mile Delivery Optimization

**Challenge**: Minimize delivery time and cost for final leg to customers

**Solution**: Model delivery network with:
- Warehouses and distribution centers
- Customer locations
- Routes with distance, time, traffic
- Vehicle capacity constraints

**Benefits**:
- Reduced delivery times (15-30%)
- Lower fuel costs (10-20%)
- Improved customer satisfaction
- Dynamic route adjustments

### 2. Multi-Tier Supplier Network

**Challenge**: Manage complex supplier dependencies and risks

**Solution**: Build supplier graph with:
- Suppliers at multiple tiers
- Component dependencies
- Lead times and capacities
- Geographic risks

**Benefits**:
- Identify single points of failure
- Assess cascade impact
- Optimize supplier mix
- Plan contingencies

### 3. Warehouse Network Optimization

**Challenge**: Determine optimal warehouse locations and inventory levels

**Solution**: Model warehouse network:
- Warehouse locations and capacities
- Customer demand patterns
- Transportation costs
- Service level requirements

**Benefits**:
- Minimize total logistics costs
- Reduce inventory holding
- Improve service levels
- Optimize warehouse placement

## Data Model

### Network Entities

```gql
CREATE GRAPH SupplyChainNetwork;
USE SupplyChainNetwork;

-- Facilities
CREATE
  (:Warehouse {
    id: 'wh_1',
    name: 'Seattle Distribution Center',
    location: point({latitude: 47.6062, longitude: -122.3321}),
    capacity: 100000,
    current_inventory: 75000
  }),
  (:Warehouse {
    id: 'wh_2',
    name: 'Portland Hub',
    location: point({latitude: 45.5152, longitude: -122.6784}),
    capacity: 50000,
    current_inventory: 30000
  }),
  (:Supplier {
    id: 'sup_1',
    name: 'Component Manufacturer Inc',
    location: point({latitude: 37.7749, longitude: -122.4194}),
    lead_time_days: 7,
    reliability: 0.95
  }),
  (:Customer {
    id: 'cust_1',
    name: 'ABC Retail',
    location: point({latitude: 47.6101, longitude: -122.2015}),
    demand_weekly: 500
  });
```

### Routes and Costs

```gql
-- Transportation routes
MATCH (wh1:Warehouse {id: 'wh_1'}), (wh2:Warehouse {id: 'wh_2'})
CREATE (wh1)-[:ROUTE {
  distance_km: 280,
  time_hours: 3.5,
  cost_per_unit: 0.50,
  mode: 'truck',
  capacity: 5000
}]->(wh2);

MATCH (wh:Warehouse {id: 'wh_1'}), (cust:Customer {id: 'cust_1'})
CREATE (wh)-[:ROUTE {
  distance_km: 15,
  time_hours: 0.5,
  cost_per_unit: 0.25,
  mode: 'van',
  capacity: 100
}]->(cust);

-- Supplier relationships
MATCH (sup:Supplier {id: 'sup_1'}), (wh:Warehouse {id: 'wh_1'})
CREATE (sup)-[:SUPPLIES {
  lead_time_days: 7,
  min_order_quantity: 1000,
  cost_per_unit: 5.00,
  reliability: 0.95
}]->(wh);
```

### Inventory and Products

```gql
-- Products
CREATE
  (:Product {
    id: 'prod_1',
    sku: 'WIDGET-001',
    name: 'Standard Widget',
    unit_cost: 5.00,
    unit_price: 15.00,
    weight_kg: 0.5
  }),
  (:Product {
    id: 'prod_2',
    sku: 'GADGET-001',
    name: 'Premium Gadget',
    unit_cost: 20.00,
    unit_price: 60.00,
    weight_kg: 2.0
  });

-- Inventory at locations
MATCH (wh:Warehouse {id: 'wh_1'}), (prod:Product {id: 'prod_1'})
CREATE (wh)-[:STOCKS {
  quantity: 5000,
  reorder_point: 1000,
  reorder_quantity: 2000,
  last_updated: timestamp()
}]->(prod);
```

## Implementation Guide

### Step 1: Route Optimization

#### Shortest Path (Distance)

```gql
-- Find shortest route from warehouse to customer
MATCH (wh:Warehouse {id: 'wh_1'}), (cust:Customer {id: 'cust_1'}),
      path = shortestPath((wh)-[:ROUTE*]->(cust))
RETURN [n IN nodes(path) | n.name] AS route,
       reduce(dist = 0, r IN relationships(path) | dist + r.distance_km) AS total_distance,
       reduce(time = 0, r IN relationships(path) | time + r.time_hours) AS total_time;
```

#### Cheapest Path (Cost)

```gql
-- Find cheapest route using Dijkstra
CALL graph.dijkstra('SupplyChainNetwork', {
  start_node: {id: 'wh_1'},
  end_node: {id: 'cust_1'},
  relationship_type: 'ROUTE',
  weight_property: 'cost_per_unit',
  minimize: true
})
YIELD path, cost
RETURN [n IN nodes(path) | n.name] AS route,
       cost AS total_cost,
       length(path) AS hops;
```

#### Multi-Constraint Optimization

```gql
-- Find route optimizing multiple factors
MATCH (wh:Warehouse {id: 'wh_1'}), (cust:Customer {id: 'cust_1'}),
      path = (wh)-[:ROUTE*1..5]->(cust)
WITH path,
     reduce(dist = 0, r IN relationships(path) | dist + r.distance_km) AS distance,
     reduce(cost = 0, r IN relationships(path) | cost + r.cost_per_unit) AS cost,
     reduce(time = 0, r IN relationships(path) | time + r.time_hours) AS time
WHERE time <= 24  -- Delivery within 24 hours
RETURN [n IN nodes(path) | n.name] AS route,
       distance,
       cost,
       time,
       (cost * 0.5 + time * 0.3 + distance * 0.2) AS composite_score
ORDER BY composite_score ASC
LIMIT 1;
```

### Step 2: Inventory Management

#### Stock Level Monitoring

```gql
-- Find low inventory items
MATCH (loc:Warehouse)-[stock:STOCKS]->(prod:Product)
WHERE stock.quantity < stock.reorder_point
RETURN loc.name AS warehouse,
       prod.sku,
       prod.name,
       stock.quantity AS current_stock,
       stock.reorder_point,
       stock.reorder_quantity AS suggested_order
ORDER BY (stock.reorder_point - stock.quantity) DESC;
```

#### Inventory Optimization

```gql
-- Calculate optimal stock distribution
MATCH (wh:Warehouse)-[stock:STOCKS]->(prod:Product)
OPTIONAL MATCH (wh)-[:ROUTE]->(cust:Customer)
WITH wh, prod, stock.quantity AS current_stock,
     sum(cust.demand_weekly) AS weekly_demand
RETURN wh.name,
       prod.sku,
       current_stock,
       weekly_demand,
       CASE
         WHEN current_stock < weekly_demand * 2 THEN 'CRITICAL'
         WHEN current_stock < weekly_demand * 4 THEN 'LOW'
         ELSE 'ADEQUATE'
       END AS stock_status,
       (weekly_demand * 4 - current_stock) AS recommended_reorder;
```

### Step 3: Supplier Network Analysis

#### Identify Critical Suppliers

```gql
-- Find suppliers with high impact (many downstream customers)
MATCH (sup:Supplier)-[:SUPPLIES*1..3]->(node)
WITH sup, count(DISTINCT node) AS reach
ORDER BY reach DESC
RETURN sup.name,
       sup.reliability,
       reach AS network_reach,
       CASE
         WHEN sup.reliability < 0.8 THEN 'HIGH_RISK'
         WHEN reach > 10 THEN 'CRITICAL'
         ELSE 'NORMAL'
       END AS risk_level;
```

#### Supply Chain Risk Assessment

```gql
-- Find single points of failure
MATCH path = (sup:Supplier)-[:SUPPLIES*]->(wh:Warehouse)-[:ROUTE*]->(cust:Customer)
WITH sup, cust, count(DISTINCT path) AS alternative_paths
WHERE alternative_paths = 1
RETURN sup.name AS critical_supplier,
       cust.name AS affected_customer,
       'SINGLE_PATH' AS risk_type;

-- Geographic concentration risk
MATCH (sup:Supplier)
WITH sup.location.latitude AS lat, sup.location.longitude AS lon,
     count(sup) AS supplier_count
WHERE supplier_count > 5
RETURN point({latitude: lat, longitude: lon}) AS concentration_point,
       supplier_count,
       'GEOGRAPHIC_CONCENTRATION' AS risk_type;
```

### Step 4: Real-Time Tracking

#### Shipment Tracking

```gql
-- Model shipments
CREATE
  (:Shipment {
    id: 'ship_1',
    order_id: 'ord_12345',
    status: 'in_transit',
    created: timestamp(),
    estimated_delivery: timestamp() + (24 * 60 * 60 * 1000)
  });

-- Track shipment location
MATCH (ship:Shipment {id: 'ship_1'}), (current_loc:Warehouse {id: 'wh_2'})
CREATE (ship)-[:CURRENT_LOCATION {
  timestamp: timestamp(),
  next_hop: 'wh_1'
}]->(current_loc);

-- Query shipment status
MATCH (ship:Shipment {id: 'ship_1'})-[:CURRENT_LOCATION]->(loc)
OPTIONAL MATCH path = (loc)-[:ROUTE*]->(destination)
RETURN ship.status,
       loc.name AS current_location,
       ship.estimated_delivery,
       length(path) AS remaining_hops;
```

#### ETA Calculation

```gql
-- Calculate updated ETA based on current location
MATCH (ship:Shipment {id: 'ship_1'})-[:CURRENT_LOCATION]->(current:Warehouse)
MATCH (destination:Customer {id: 'cust_1'}),
      path = shortestPath((current)-[:ROUTE*]->(destination))
WITH ship, path,
     reduce(time = 0, r IN relationships(path) | time + r.time_hours) AS remaining_hours
RETURN ship.id,
       ship.estimated_delivery AS original_eta,
       timestamp() + (remaining_hours * 60 * 60 * 1000) AS updated_eta,
       (timestamp() + (remaining_hours * 60 * 60 * 1000) - ship.estimated_delivery) / (60 * 60 * 1000) AS delay_hours;
```

### Step 5: Network Optimization

#### Bottleneck Detection

```gql
-- Find routes with highest traffic
MATCH ()-[route:ROUTE]->()
WITH route, route.capacity AS capacity,
     route.current_load AS load
WHERE load > capacity * 0.8
RETURN startNode(route).name AS from_location,
       endNode(route).name AS to_location,
       load,
       capacity,
       (load * 1.0 / capacity) AS utilization
ORDER BY utilization DESC;
```

#### Betweenness Centrality (Critical Nodes)

```gql
-- Find critical warehouses in network
CALL graph.betweennessCentrality('SupplyChainNetwork', {
  relationship_type: 'ROUTE',
  normalized: true
})
YIELD node, score
WHERE node:Warehouse
RETURN node.name AS warehouse,
       node.capacity,
       score AS criticality_score
ORDER BY score DESC;
```

### Step 6: Demand Forecasting Integration

```gql
-- Update demand based on historical patterns
MATCH (cust:Customer)-[:ORDERED]->(order:Order)
WHERE order.timestamp > timestamp() - (90 * 24 * 60 * 60 * 1000)  -- Last 90 days
WITH cust, sum(order.quantity) AS total_ordered, count(order) AS order_count
SET cust.demand_weekly = (total_ordered * 1.0 / 13);  -- 90 days ≈ 13 weeks

-- Adjust inventory based on forecasted demand
MATCH (wh:Warehouse)-[stock:STOCKS]->(prod:Product)
MATCH (wh)-[:ROUTE]->(cust:Customer)
WITH wh, prod, stock, sum(cust.demand_weekly) AS forecast_demand
SET stock.reorder_point = forecast_demand * 2,
    stock.reorder_quantity = forecast_demand * 4;
```

## Advanced Patterns

### Multi-Modal Transportation

```gql
-- Model different transport modes
MATCH (origin:Warehouse {id: 'wh_1'}), (dest:Warehouse {id: 'wh_3'})
CREATE (origin)-[:ROUTE {
  mode: 'truck',
  distance_km: 500,
  time_hours: 8,
  cost_per_unit: 1.00,
  carbon_kg: 50
}]->(dest);

CREATE (origin)-[:ROUTE {
  mode: 'rail',
  distance_km: 550,
  time_hours: 12,
  cost_per_unit: 0.60,
  carbon_kg: 20
}]->(dest);

-- Optimize for cost vs. speed vs. sustainability
MATCH (origin:Warehouse {id: 'wh_1'}), (dest:Warehouse {id: 'wh_3'}),
      path = (origin)-[:ROUTE*]->(dest)
WITH path,
     reduce(cost = 0, r IN relationships(path) | cost + r.cost_per_unit) AS total_cost,
     reduce(time = 0, r IN relationships(path) | time + r.time_hours) AS total_time,
     reduce(carbon = 0, r IN relationships(path) | carbon + r.carbon_kg) AS total_carbon
RETURN [r IN relationships(path) | r.mode] AS transport_modes,
       total_cost,
       total_time,
       total_carbon,
       (total_cost * 0.4 + total_time * 0.3 + total_carbon * 0.3) AS sustainability_score
ORDER BY sustainability_score ASC;
```

### Vehicle Routing Problem (VRP)

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

```python
# Python client - Solve VRP with capacity constraints
from geode_client import Client

client = Client(host="geode.example.com", port=3141)

async def solve_vrp(conn, warehouse_id, customer_ids, vehicle_capacity):
    """Solve VRP for multiple deliveries from one warehouse"""

    # Get distances between all points
    query = """
        MATCH (wh:Warehouse {id: $wh_id})
        UNWIND $cust_ids AS cust_id
        MATCH (cust:Customer {id: cust_id})
        MATCH path = shortestPath((wh)-[:ROUTE*]->(cust))
        RETURN cust_id,
               reduce(dist = 0, r IN relationships(path) | dist + r.distance_km) AS distance,
               cust.demand_weekly AS demand
    """

    page, _ = await conn.query(query, {
        'wh_id': warehouse_id,
        'cust_ids': customer_ids
    })

    distance_map = {row["cust_id"].raw_value: row["distance"].raw_value for row in page.rows}
    demand_map = {row["cust_id"].raw_value: row["demand"].raw_value for row in page.rows}

    def get_distance(_from_id, to_id):
        return distance_map.get(to_id, float("inf"))

    def get_demand(cust_id):
        return demand_map.get(cust_id, 0)

    # Greedy nearest neighbor with capacity constraints
    routes = []
    current_route = []
    current_capacity = 0
    unvisited = set(customer_ids)

    while unvisited:
        if not current_route:
            next_cust = min(unvisited, key=lambda c: get_distance(warehouse_id, c))
        else:
            last_cust = current_route[-1]
            next_cust = min(unvisited, key=lambda c: get_distance(last_cust, c))

        demand = get_demand(next_cust)

        if current_capacity + demand <= vehicle_capacity:
            current_route.append(next_cust)
            current_capacity += demand
            unvisited.remove(next_cust)
        else:
            routes.append(current_route)
            current_route = []
            current_capacity = 0

    if current_route:
        routes.append(current_route)

    return routes

# async with client.connection() as conn:
#     routes = await solve_vrp(conn, "wh_1", ["c1", "c2"], 200)
```

### Dynamic Rerouting

```gql
-- Handle route disruption (e.g., road closure)
MATCH ()-[disrupted:ROUTE {id: 'route_123'}]->()
SET disrupted.available = false,
    disrupted.reason = 'road_closure',
    disrupted.until = timestamp() + (48 * 60 * 60 * 1000);

-- Find alternative routes
MATCH (origin:Warehouse {id: 'wh_1'}), (dest:Customer {id: 'cust_1'}),
      path = (origin)-[:ROUTE*]->(dest)
WHERE ALL(r IN relationships(path) WHERE r.available = true)
WITH path,
     reduce(dist = 0, r IN relationships(path) | dist + r.distance_km) AS distance,
     reduce(cost = 0, r IN relationships(path) | cost + r.cost_per_unit) AS cost
RETURN [n IN nodes(path) | n.name] AS alternative_route,
       distance,
       cost
ORDER BY cost ASC
LIMIT 3;
```

## Performance Optimization

### Spatial Indexing

```gql
-- Create spatial index for location-based queries
CREATE INDEX location_spatial_idx ON Warehouse(location) USING spatial;
CREATE INDEX customer_location_idx ON Customer(location) USING spatial;

-- Find nearby warehouses
MATCH (wh:Warehouse)
WHERE point.distance(wh.location, point({latitude: 47.6062, longitude: -122.3321})) < 50000  -- 50km
RETURN wh.name, wh.location;
```

### Route Caching

```python
# Cache frequently used routes
from geode_client import Client

client = Client(host="geode.example.com", port=3141)
route_cache = {}

async def get_shortest_path(conn, origin_id, dest_id):
    """Cache shortest paths between common locations"""
    cache_key = (origin_id, dest_id)
    if cache_key in route_cache:
        return route_cache[cache_key]

    page, _ = await conn.query("""
        MATCH (o {id: $origin}), (d {id: $dest}),
              path = shortestPath((o)-[:ROUTE*]->(d))
        RETURN path
    """, {'origin': origin_id, 'dest': dest_id})

    path = page.rows[0]["path"].raw_value if page.rows else None
    route_cache[cache_key] = path
    return path

# async with client.connection() as conn:
#     path = await get_shortest_path(conn, "wh_1", "cust_42")
```

### Materialized Views

```gql
-- Pre-compute common routes
MATCH (wh:Warehouse)-[r:ROUTE*1..3]->(cust:Customer)
WITH wh, cust,
     reduce(dist = 0, rel IN r | dist + rel.distance_km) AS total_distance,
     reduce(cost = 0, rel IN r | cost + rel.cost_per_unit) AS total_cost
CREATE (wh)-[:PRECOMPUTED_ROUTE {
  distance: total_distance,
  cost: total_cost,
  updated: timestamp()
}]->(cust);

-- Query precomputed routes (much faster)
MATCH (wh:Warehouse {id: 'wh_1'})-[route:PRECOMPUTED_ROUTE]->(cust:Customer)
RETURN cust.name, route.distance, route.cost
ORDER BY route.cost ASC;
```

## Metrics and KPIs

### Operational Metrics

```gql
-- Average delivery time
MATCH ()-[route:ROUTE]->()
RETURN avg(route.time_hours) AS avg_delivery_time;

-- Network utilization
MATCH ()-[route:ROUTE]->()
WITH route,
     CASE WHEN route.current_load IS NOT NULL
          THEN route.current_load * 1.0 / route.capacity
          ELSE 0
     END AS utilization
RETURN avg(utilization) AS avg_network_utilization,
       max(utilization) AS max_utilization,
       count(CASE WHEN utilization > 0.8 THEN 1 END) AS congested_routes;

-- Inventory turnover
MATCH (wh:Warehouse)-[stock:STOCKS]->(prod:Product)
WITH prod, sum(stock.quantity) AS total_stock
MATCH (ord:Order)-[:CONTAINS]->(prod)
WHERE ord.timestamp > timestamp() - (30 * 24 * 60 * 60 * 1000)
WITH prod, total_stock, sum(ord.quantity) AS monthly_sales
RETURN prod.sku,
       monthly_sales * 12.0 / total_stock AS annual_turnover;
```

### Cost Analysis

```gql
-- Total logistics cost
MATCH (order:Order)-[:SHIPPED_VIA]->(route:ROUTE)
WHERE order.timestamp > timestamp() - (30 * 24 * 60 * 60 * 1000)
RETURN sum(order.quantity * route.cost_per_unit) AS monthly_logistics_cost;

-- Cost per delivery
MATCH (order:Order)-[:DELIVERED_TO]->(cust:Customer)
WHERE order.timestamp > timestamp() - (30 * 24 * 60 * 60 * 1000)
WITH order, sum(order.logistics_cost) AS delivery_cost
RETURN avg(delivery_cost) AS avg_cost_per_delivery,
       percentile_cont(delivery_cost, 0.5) AS median_cost,
       percentile_cont(delivery_cost, 0.95) AS p95_cost;
```

## Best Practices

### 1. Model Granularity

- **Start coarse, refine as needed**: Begin with major hubs, add detail later
- **Balance detail vs. performance**: Too many nodes slow queries
- **Use aggregation**: Group small customers into zones

### 2. Weight Selection

- **Normalize weights**: Ensure comparable scales (distance vs. cost)
- **Time-varying weights**: Update traffic patterns by time of day
- **Multi-objective**: Combine cost, time, reliability, sustainability

### 3. Data Quality

- **Update regularly**: Route conditions change (traffic, weather)
- **Validate constraints**: Capacity, lead times, availability
- **Track exceptions**: Monitor deviations from plan

## Complete Example: E-Commerce Fulfillment

```gql
-- Create fulfillment network
CREATE
  (:FulfillmentCenter {id: 'fc_1', name: 'East Coast FC', capacity: 200000}),
  (:FulfillmentCenter {id: 'fc_2', name: 'West Coast FC', capacity: 150000}),
  (:FulfillmentCenter {id: 'fc_3', name: 'Midwest FC', capacity: 100000});

-- Customer orders
CREATE
  (:Order {id: 'ord_1', customer_zip: '98101', quantity: 5, priority: 'standard'}),
  (:Order {id: 'ord_2', customer_zip: '94102', quantity: 10, priority: 'express'}),
  (:Order {id: 'ord_3', customer_zip: '60601', quantity: 3, priority: 'standard'});

-- Route orders to optimal fulfillment center
MATCH (fc:FulfillmentCenter), (ord:Order)
MATCH (fc)-[stock:STOCKS]->(prod:Product)
WHERE stock.quantity >= ord.quantity
WITH fc, ord,
     point.distance(
       fc.location,
       geocode(ord.customer_zip)
     ) AS distance
ORDER BY ord.priority DESC, distance ASC
WITH ord, head(collect(fc)) AS optimal_fc
CREATE (ord)-[:FULFILLED_BY]->(optimal_fc);

-- Generate pick lists
MATCH (fc:FulfillmentCenter {id: 'fc_1'})<-[:FULFILLED_BY]-(ord:Order)
RETURN ord.id,
       ord.customer_zip,
       ord.quantity,
       ord.priority
ORDER BY ord.priority DESC, ord.id;
```

## Next Steps

- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Shortest path, network flow
- [Performance Tuning](/docs/performance/) - Optimize large-scale logistics queries
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Live tracking and alerts
- [Spatial Queries](/docs/query/indexing-and-optimization/) - Geographic search optimization

## References

- [Data Model Guide](/docs/model/data-model-and-types/) - Modeling transportation networks
- [GQL Guide](/docs/gql/guide/) - Path queries and aggregations
- [Dijkstra Tutorial](/docs/tutorials/graph-algorithms-tutorial/) - Weighted shortest paths

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
