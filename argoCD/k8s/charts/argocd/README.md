# ArgoCD ApplicationSet Structure

```ascii
k8s/
├── base/                         # Base infrastructure components
│   ├── aws-ebs-csi/              # Each component has its own directory
│   │   ├── Chart.yaml            # Helm chart definition
│   │   └── values.yaml           # Default base values
│   ├── aws-lb-controller/
│   ├── datadog-operator/
│   └── ...
│
├── ngc-int/                      # Environment overlay
│   └── infra/                    # Namespace-specific configs
│       ├── aws-ebs-csi/          # Environment-specific overrides
│       │   └── values.yaml       # Values that override base
│       └── ...
│
└── other-environments/           # Other environment overlays
    └── ...

             ⬇️ ArgoCD ApplicationSet Flow ⬇️

┌────────────────────────────────────────────────────┐
│ ApplicationSet (Helm)                              │
│                                                    │
│ 1. Defines template for multiple Applications      │
│ 2. Uses generators to create Applications          │
│ 3. Manages multiple clusters/environments          │
└────────────────────────────────────────────────────┘
                    │
                    ├─────────────────┐
                    │                 │
┌───────────────── ─▼────┐  ┌─────────▼──────────────┐
│ Base Configuration     │  │ Environment Overlay    │
│                        │  │                        │
│ - Default values       │  │ - Environment specific │
│ - Core components      │  │ - Overrides base       │
│ - Shared settings      │  │ - Additional configs   │
└────────────────────────┘  └────────────────────────┘

How it works:
1. ApplicationSet template defines how to deploy components
2. Base contains default configurations
3. Environment overlays customize the base configs
4. Helm merges base + overlay values
5. ArgoCD ensures desired state matches actual state
```

## Key Concepts

1. **Base Layer (`/base`)**

   - Contains foundational Helm charts
   - Defines default configurations
   - Reusable across environments

2. **Environment Overlays**

   - Environment-specific configurations
   - Override base values when needed
   - Organized by namespace

3. **ApplicationSet**

   - Templates multiple ArgoCD Applications
   - Uses generators for different environments
   - Maintains consistent structure across clusters

4. **Value Precedence**
   ```
   Environment Values > Base Values > Chart Defaults
   ```

## Example Flow

1. ApplicationSet sees a new environment needs deployment
2. Creates Application from template
3. Combines base + environment values
4. ArgoCD syncs the resulting configuration
5. Kubernetes applies the changes

This structure enables:

- Consistent deployments across environments
- Environment-specific customization
- Single source of truth for configurations
- GitOps-based management

## Component Relationship

```mermaid
graph TD
    AS[ApplicationSet] --> |generates| APP1[Application 1]
    AS --> |generates| APP2[Application 2]
    AS --> |generates| APP3[Application 3]

    APP1 --> |references| BASE[Base Configuration]
    APP1 --> |overrides with| ENV1[Environment Overlay]

    BASE --> |contains| COMP1[aws-ebs-csi]
    BASE --> |contains| COMP2[aws-lb-controller]
    BASE --> |contains| COMP3[datadog-operator]

    ENV1 --> |customizes| ECOMP1[aws-ebs-csi values]
    ENV1 --> |customizes| ECOMP2[aws-lb-controller values]

    subgraph "Base Layer"
        BASE
        COMP1
        COMP2
        COMP3
    end

    subgraph "Environment Overlay"
        ENV1
        ECOMP1
        ECOMP2
    end
```

## Value Merge Process

```mermaid
flowchart LR
    BC[Base Config] --> |merge| MV{Merge Values}
    EO[Env Overlay] --> |override| MV
    CD[Chart Defaults] --> |fallback| MV
    MV --> FR[Final Resources]

    style MV fill:#f96,stroke:#333
    style FR fill:#6f9,stroke:#333
```

## Deployment Flow

```mermaid
sequenceDiagram
    participant AS as ApplicationSet
    participant AG as ArgoCD
    participant Base as Base Layer
    participant Env as Environment Layer
    participant K8s as Kubernetes

    AS->>AG: Generate Applications
    AG->>Base: Get Base Configuration
    AG->>Env: Get Environment Overrides
    AG->>AG: Merge Configurations
    AG->>K8s: Apply Resources
    K8s->>K8s: Reconcile State
    K8s-->>AG: Report Status
    AG-->>AS: Update Status
```

## Directory Structure

```mermaid
graph TD
    K8S[k8s/] --> BASE[base/]
    K8S --> ENV[environments/]

    BASE --> CSI[aws-ebs-csi/]
    BASE --> LB[aws-lb-controller/]
    BASE --> DD[datadog-operator/]

    CSI --> |contains| CH1[Chart.yaml]
    CSI --> |contains| VAL1[values.yaml]

    ENV --> INT[ngc-int/]
    ENV --> PROD[ngc-prod/]

    INT --> |overrides| INTCSI[aws-ebs-csi/]
    INTCSI --> |contains| INTVAL[values.yaml]

    style K8S fill:#f9f,stroke:#333
    style BASE fill:#bbf,stroke:#333
    style ENV fill:#bfb,stroke:#333
```
