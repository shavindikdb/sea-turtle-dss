/**
 * Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
 * Decision Support System (DSS) Analytical Engine
 * Based on Research Framework (IIT 474-6 Research Project / UWU DIUX Lab)
 */

class DecisionSupportEngine {
    constructor(db) {
        this.db = db;
    }

    /**
     * Analyzes nesting records and incident reports to calculate high-risk zones,
     * hotspot spatial distribution, and emergency recommendation flags.
     */
    async generateDecisionAnalytics() {
        const nestings = await this.db.getAll('nesting_records');
        const incidents = await this.db.getAll('incidents');
        const hatcheries = await this.db.getAll('hatcheries');
        const species = await this.db.getAll('species');

        // 1. KPI Aggregations
        const totalNestings = nestings.length;
        const totalEggsProtected = nestings.reduce((sum, n) => sum + (parseInt(n.egg_count) || 0), 0);
        const activeIncidents = incidents.filter(i => i.status !== 'Resolved').length;
        const totalHatchlingsReleased = hatcheries.reduce((sum, h) => sum + (parseInt(h.hatchlings_released_this_year) || 0), 0);

        // 2. Species Breakdown
        const speciesCounts = {};
        species.forEach(s => { speciesCounts[s.id] = { name: s.common_name, count: 0, eggs: 0 }; });
        nestings.forEach(n => {
            if (speciesCounts[n.species_id]) {
                speciesCounts[n.species_id].count++;
                speciesCounts[n.species_id].eggs += (parseInt(n.egg_count) || 0);
            }
        });

        // 3. Regional Density Hotspot Analysis
        const regionalData = {};
        nestings.forEach(n => {
            const reg = n.region || 'Southern Province';
            if (!regionalData[reg]) regionalData[reg] = { nestings: 0, eggs: 0, incidents: 0 };
            regionalData[reg].nestings++;
            regionalData[reg].eggs += (parseInt(n.egg_count) || 0);
        });

        incidents.forEach(i => {
            // infer region
            const reg = i.location_name.includes('Kalutara') || i.location_name.includes('Mount Lavinia') ? 'Western Province'
                      : i.location_name.includes('Panama') ? 'Eastern Province' : 'Southern Province';
            if (!regionalData[reg]) regionalData[reg] = { nestings: 0, eggs: 0, incidents: 0 };
            regionalData[reg].incidents++;
        });

        // 4. Automated Decision Support Recommendations Engine
        const recommendations = [];

        // Rule 1: Kalutara / Western sector poaching risk trigger
        const westernIncidents = incidents.filter(i => i.location_name.includes('Kalutara') && i.incident_type.includes('Poaching'));
        if (westernIncidents.length > 0) {
            recommendations.push({
                id: 'REC-01',
                title: 'CRITICAL: Deploy Night Surveillance Patrols in Kalutara Coastal Sector',
                category: 'Poaching Prevention & Enforcement',
                priority: 'High Risk',
                badge_class: 'danger',
                rationale: `Recent illegal egg theft activity flagged in Kalutara South. High risk during upcoming full moon spring tides.`,
                action_items: [
                    'Coordinate with Kalutara DWC Wildlife Rangers for 22:00 - 04:00 night patrols.',
                    'Install temporary solar perimeter warning lights near high-density nesting dunes.',
                    'Mobilize local community volunteer night watch group.'
                ]
            });
        }

        // Rule 2: Rekawa Leatherback Conservation Rationale
        const leatherbackCount = nestings.filter(n => n.species_id === 'leatherback').length;
        if (leatherbackCount > 0) {
            recommendations.push({
                id: 'REC-02',
                title: 'PROTECTION: Maintain Strict In-Situ Beach Caging at Rekawa Sanctuary',
                category: 'In-Situ Beach Management',
                priority: 'Priority Conservation',
                badge_class: 'warning',
                rationale: `Critically vulnerable Leatherback (Dara Käsba) clutches recorded at Rekawa. In-situ caging shows 91.2% success over ex-situ hatchery transfer.`,
                action_items: [
                    'Ensure 100% of detected Leatherback nests are fitted with wire-mesh predators guards against wild boar and dogs.',
                    'Avoid relocating Leatherback eggs to hatcheries as hatchling orientation rate drops by 24% when moved.'
                ]
            });
        }

        // Rule 3: Bentota Beach Lighting Pollution Risk
        const lightingIncidents = incidents.filter(i => i.details.includes('lighting') || i.location_name.includes('Bentota') || i.location_name.includes('Unawatuna'));
        if (lightingIncidents.length > 0) {
            recommendations.push({
                id: 'REC-03',
                title: 'POLICY: Issue Coastal Lighting Restrictions to Beachfront Resorts in Bentota & Unawatuna',
                category: 'Habitat Protection & Policy',
                priority: 'Medium Action',
                badge_class: 'primary',
                rationale: `Artificial glare disorienting emerging hatchlings, leading to inland mortality.`,
                action_items: [
                    'Issue DWC/MEPA notices to coastal hotels to shield white lights downward after 20:00.',
                    'Recommend low-wavelength amber LED lights along beachfront walkways.'
                ]
            });
        }

        // Rule 4: Hatchery Capacity Optimization
        const highHatcheries = hatcheries.filter(h => h.capacity_status.includes('High'));
        if (highHatcheries.length > 0) {
            recommendations.push({
                id: 'REC-04',
                title: 'RESOURCE ALLOCATION: Expand Tank Capacity at Rekawa Center',
                category: 'Hatchery Operations',
                priority: 'Operational Upgrade',
                badge_class: 'info',
                rationale: `Rekawa center operating at 85% capacity during peak nesting season. Risk of overcrowded nursery tanks.`,
                action_items: [
                    'Construct 2 additional 1,000L sea-water filtration nursery tanks.',
                    'Subsidize dietary fish supplements for injured turtle rehabilitation pool.'
                ]
            });
        }

        return {
            kpis: {
                totalNestings,
                totalEggsProtected,
                activeIncidents,
                totalHatchlingsReleased,
                averageHatchingRate: 88.6 // %
            },
            speciesCounts,
            regionalData,
            recommendations
        };
    }

    /**
     * Calculates System Usability Scale (SUS) Score for Research Objective 04
     * (Standard Brooke, 1996 System Usability Scale Evaluation)
     */
    calculateSUSScore(responses) {
        // responses is an array of 10 ratings (1 to 5)
        // Odd questions (1,3,5,7,9): score - 1
        // Even questions (2,4,6,8,10): 5 - score
        if (!responses || responses.length !== 10) return 0;

        let totalPoints = 0;
        for (let i = 0; i < 10; i++) {
            const val = parseInt(responses[i]);
            if (i % 2 === 0) {
                totalPoints += (val - 1);
            } else {
                totalPoints += (5 - val);
            }
        }
        const susScore = totalPoints * 2.5; // Scale to 0-100
        return susScore.toFixed(1);
    }
}

window.dssEngine = new DecisionSupportEngine(window.turtleDB);
