# area_config.py
# 6 parent areas used for polling + adjacency map for community notifications.
# Sub-area → parent mapping lets us serve cached data for any Tshwane sub-area
# without burning extra API calls.

# The 6 areas we poll
POLL_AREAS: dict[str, str] = {
    "za_gt_tsh_mamelodi_1rcu":   "Mamelodi",
    "za_gt_tsh_eersterustext2_umbi": "Eersterust",
    "za_gt_tsh_nellmapius_muve": "Nellmapius",
    "za_gt_tsh_colbyn_49z2":     "Colbyn",
    "za_gt_tsh_kilnerpark_6mbj": "Kilner Park",
    "za_gt_tsh_hatfield_ktsg":   "Hatfield",
}

# Sub-area → parent (for cache lookups when a user's stored area_id is a sub-area)
SUB_TO_PARENT: dict[str, str] = {
    # Mamelodi sub-areas
    "za_gt_tsh_mamelodilc5_a7jv":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodijb3_0znp":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodikc4_dx41":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodifb3_3tcp":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodieb2_fh68":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodidb1_qhs2":  "za_gt_tsh_mamelodi_1rcu",
    "za_gt_tsh_mamelodica3_r12c":  "za_gt_tsh_mamelodi_1rcu",
    # Eersterust sub-areas
    "za_gt_tsh_eersterustext3_7q2u": "za_gt_tsh_eersterustext2_umbi",
    "za_gt_tsh_eersterustext4_8bkv": "za_gt_tsh_eersterustext2_umbi",
    "za_gt_tsh_eersterustext5_towr": "za_gt_tsh_eersterustext2_umbi",
    "za_gt_tsh_eersterustext6_5cxc": "za_gt_tsh_eersterustext2_umbi",
    "za_gt_tsh_neweersterus_4640":   "za_gt_tsh_eersterustext2_umbi",
    # Nellmapius sub-areas
    "za_gt_tsh_nellmapiusext3_jxo5": "za_gt_tsh_nellmapius_muve",
    "za_gt_tsh_nellmapiusext4_971i": "za_gt_tsh_nellmapius_muve",
    "za_gt_tsh_nellmapiusext6_bbub": "za_gt_tsh_nellmapius_muve",
    "za_gt_tsh_nellmapiusext7_ie14": "za_gt_tsh_nellmapius_muve",
    "za_gt_tsh_nellmapiusext8_t8nl": "za_gt_tsh_nellmapius_muve",
    "za_gt_tsh_nellmapiusext9_pq96": "za_gt_tsh_nellmapius_muve",
}

def resolve_area_id(area_id: str) -> str:
    """Return the parent poll area for any given area_id."""
    return SUB_TO_PARENT.get(area_id, area_id)

# Adjacency — areas within notification range of each other.
# Symmetric: if A notifies B, B also notifies A.
# Geographic rationale:
#   - Mamelodi cluster: Mamelodi / Eersterust / Nellmapius are directly adjacent
#   - Suburban cluster: Colbyn / Kilnerpark / Hatfield form a tight urban triangle
#   - Cross-cluster: Eersterust bridges the two clusters (geographically between them)
ADJACENT: dict[str, list[str]] = {
    "za_gt_tsh_mamelodi_1rcu": [
        "za_gt_tsh_eersterustext2_umbi",
        "za_gt_tsh_nellmapius_muve",
    ],
    "za_gt_tsh_eersterustext2_umbi": [
        "za_gt_tsh_mamelodi_1rcu",
        "za_gt_tsh_nellmapius_muve",
        "za_gt_tsh_colbyn_49z2",      # Eersterust borders the suburban cluster
    ],
    "za_gt_tsh_nellmapius_muve": [
        "za_gt_tsh_mamelodi_1rcu",
        "za_gt_tsh_eersterustext2_umbi",
    ],
    "za_gt_tsh_colbyn_49z2": [
        "za_gt_tsh_kilnerpark_6mbj",
        "za_gt_tsh_hatfield_ktsg",
        "za_gt_tsh_eersterustext2_umbi",
    ],
    "za_gt_tsh_kilnerpark_6mbj": [
        "za_gt_tsh_colbyn_49z2",
        "za_gt_tsh_hatfield_ktsg",
    ],
    "za_gt_tsh_hatfield_ktsg": [
        "za_gt_tsh_colbyn_49z2",
        "za_gt_tsh_kilnerpark_6mbj",
    ],
}

# Human-readable area options for the frontend profile area selector
AREA_OPTIONS = [
    {"id": k, "name": v} for k, v in POLL_AREAS.items()
]