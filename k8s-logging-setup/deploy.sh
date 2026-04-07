#!/bin/bash

set -e

echo "🚀 Deploying Loki Logging Stack to kube-prometheus-stack namespace..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi

# Check if kube-prometheus-stack namespace exists
if ! kubectl get namespace kube-prometheus-stack &> /dev/null; then
    echo "❌ kube-prometheus-stack namespace does not exist"
    echo "Please ensure your Prometheus stack is installed first"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Check Prometheus status
echo "🔍 Checking Prometheus status..."
PROMETHEUS_STATUS=$(kubectl get pod -l app.kubernetes.io/name=prometheus -n kube-prometheus-stack -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")

if [[ "$PROMETHEUS_STATUS" == "Running" ]]; then
    echo "✅ Prometheus is running normally"
elif [[ "$PROMETHEUS_STATUS" == "NotFound" ]]; then
    echo "ℹ️  Prometheus not found - proceeding with logging-only setup"
else
    echo "⚠️  Prometheus is in $PROMETHEUS_STATUS state"
    echo "   This is likely due to storage issues (disk full)"
    echo ""
    echo "Choose an option:"
    echo "1) Fix Prometheus (clean up storage and reduce retention)"
    echo "2) Remove Prometheus (logging-only setup)"
    echo "3) Continue anyway"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo "🧹 Fixing Prometheus storage..."
            kubectl apply -f fix-prometheus-storage.yaml
            echo "⏳ Waiting for cleanup job to complete..."
            kubectl wait --for=condition=complete --timeout=300s job/prometheus-cleanup -n kube-prometheus-stack
            echo "🔄 Restarting Prometheus..."
            kubectl delete pod -l app.kubernetes.io/name=prometheus -n kube-prometheus-stack
            ;;
        2)
            echo "🗑️  Removing Prometheus..."
            kubectl apply -f remove-prometheus.yaml
            ;;
        3)
            echo "⏭️  Continuing with current Prometheus state..."
            ;;
        *)
            echo "❌ Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

# Deploy Loki
echo "📦 Deploying Loki..."
kubectl apply -f loki-config.yaml

# Wait for Loki to be ready
echo "⏳ Waiting for Loki to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/loki -n kube-prometheus-stack

# Deploy Promtail
echo "📦 Deploying Promtail..."
kubectl apply -f promtail-config.yaml

# Wait for Promtail to be ready
echo "⏳ Waiting for Promtail to be ready..."
kubectl wait --for=condition=ready --timeout=300s pod -l app=promtail -n kube-prometheus-stack

# Add Loki data source to Grafana
echo "📦 Adding Loki data source to Grafana..."
kubectl apply -f grafana-datasource.yaml

# Restart Grafana to pick up the new data source
echo "🔄 Restarting Grafana to load new data source..."
kubectl rollout restart deployment/kube-prometheus-stack-grafana -n kube-prometheus-stack
kubectl rollout status deployment/kube-prometheus-stack-grafana -n kube-prometheus-stack

echo "✅ Loki logging stack deployed successfully!"
echo ""
echo "📊 Access your logs:"
echo "   Grafana: https://grafana.hub.elitecoders.ai/"
echo "   Go to Explore > Select 'Loki' data source"
echo ""
echo "🔍 Example LogQL queries:"
echo "   All fluid-calendar logs: {namespace=\"fluid-calendar\"}"
echo "   Error logs only: {namespace=\"fluid-calendar\"} |= \"error\""
echo "   Specific service: {namespace=\"fluid-calendar\", service=\"fluid-calendar\"}"
echo ""
echo "📈 Next steps:"
echo "   1. Update your application logger (see migration guide)"
echo "   2. Deploy updated application"
echo "   3. Verify logs are appearing in Grafana"

# Show final status
echo ""
echo "🔍 Final component status:"
kubectl get pods -n kube-prometheus-stack | grep -E "(loki|promtail|grafana|prometheus)" 