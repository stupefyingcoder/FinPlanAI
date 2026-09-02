import pandas as pd
import json
import os

# Paths to clustering files
CLUSTER_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/model data/customers_clustered_k5.csv'))
CLUSTER_META_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/model data/customer_clustering_k5_meta.json'))

# Load cluster assignments
cluster_df = pd.read_csv(CLUSTER_CSV)
with open(CLUSTER_META_JSON, 'r') as f:
    cluster_meta = json.load(f)

cluster_labels = cluster_meta['cluster_labels']

def get_customer_cluster(customer_id, net_worth=None, financial_goal=None):
    row = cluster_df[cluster_df['Customer_ID'] == customer_id]
    if not row.empty:
        cluster_num = str(row.iloc[0]['Cluster'])
        label = cluster_labels.get(cluster_num, f"Cluster {cluster_num}")
        return cluster_num, label
    # Rule-based assignment if not found
    # Use net worth and financial goal to match cluster
    if net_worth is not None and financial_goal is not None:
        # Example rules (customize as needed):
        # - High NW: > median net worth in CSV
        # - Low NW: < median net worth
        # - Match goal to cluster label
        median_nw = cluster_df['Current_Net_Worth'].median() if 'Current_Net_Worth' in cluster_df.columns else 0
        for num, label in cluster_labels.items():
            if 'High NW' in label and net_worth > median_nw:
                if financial_goal.lower() in label.lower():
                    return num, label
            elif 'Low NW' in label and net_worth <= median_nw:
                if financial_goal.lower() in label.lower():
                    return num, label
            elif financial_goal.lower() in label.lower():
                return num, label
        # Fallback: assign to closest by net worth
        if net_worth > median_nw:
            for num, label in cluster_labels.items():
                if 'High NW' in label:
                    return num, label
        else:
            for num, label in cluster_labels.items():
                if 'Low NW' in label:
                    return num, label
    return None, None
