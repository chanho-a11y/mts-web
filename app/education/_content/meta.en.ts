// 교육자료 챕터 메타데이터 (영문). 슬러그·구조는 meta.ts 와 공통.
import type { ChapterCopy } from "./meta";

export const COPY_EN: Record<string, ChapterCopy> = {
  "green-coffee": {
    title: "Green Coffee — From Seed to Cup",
    tagline: "Variety, cultivation, processing and trade — where the ceiling of a cup is set",
    description:
      "What actually separates Arabica, Canephora and Liberica; why microclimate changes acidity; how Washed, Natural, Honey and anaerobic processing work; and a worked calculation showing how the C market price becomes the price of a kilo of green coffee in Korea.",
    keywords: ["green coffee", "coffee varieties", "arabica", "coffee processing", "washed process", "natural process", "honey process", "anaerobic fermentation", "C market", "green coffee price", "specialty coffee"],
    faq: [
      { q: "What is the difference between Washed and Natural processing?",
        a: "The difference is when the mucilage is removed. Washed coffee is pulped, then fermented and rinsed so that almost all the mucilage is stripped away, which lets origin character show through transparently. Natural coffee is dried whole for 15–30 days, so sugars from the fruit migrate into the seed and fruit character, sweetness and body are emphasised. Honey sits between the two, drying with a set proportion of mucilage left on." },
      { q: "If the C market rises, how much does green coffee cost in Korea?",
        a: "Almost the whole move is passed through. For commercial Brazil, a rise from 300 to 400 US cents per pound — 33.3% — takes the landed Korean price from roughly KRW 11,600 to KRW 15,400 per kilo, a rise of 33.0%. Korea currently applies a 0% quota tariff and a VAT exemption on green coffee, and importer margin is charged as a percentage, so there is effectively no buffer." },
      { q: "Why does higher altitude improve acidity?",
        a: "Higher altitude means lower temperatures, so cherries ripen more slowly. A longer maturation lets the seed accumulate more acids and sugars and grow denser, which tends to produce clearer acidity and more complex flavour. Altitude alone does not decide it, though — microclimate, shade and variety act together." },
    ],
  },
  "extraction-theory": {
    title: "Theory — Extraction, Variables, Water, Evaluation",
    tagline: "What dissolves, and what decides how much of it does",
    description:
      "Extraction defined through soluble compounds, water and energy; why viscosity is a read-out of instantaneous concentration; what each of the seven brewing variables actually changes; and how water hardness and alkalinity divide the cup — with measured data throughout.",
    keywords: ["coffee extraction theory", "extraction yield", "TDS", "brewing variables", "brewing water", "total hardness", "alkalinity", "grind size", "roller grinder", "under-extraction", "over-extraction"],
    faq: [
      { q: "How do I tell under-extraction from over-extraction?",
        a: "Soluble compounds broadly emerge in the order acid → sugar → bitterness and astringency. Stopping at the acid stage gives a sharp, sour, hollow cup (under-extraction); running all the way through gives a bitter, drying, astringent one (over-extraction). Where the balanced window sits differs by coffee, roast and brewer, so it is more accurate not to memorise a fixed yield figure." },
      { q: "When the espresso stream goes pale, is extraction finished?",
        a: "No. Viscosity only reflects the concentration of dissolved solids at that instant. While viscosity falls, cumulative yield keeps climbing. What arrives after blonding is dilute but still adds to total yield and to the later compounds — bitterness and astringency. The cut-off should therefore be set by target yield and taste, not by viscosity." },
      { q: "How should I choose water for coffee?",
        a: "Total hardness governs extracting power; alkalinity governs the buffering that neutralises acids. Too little hardness reads as flat, too much reads as muddy, and high alkalinity presses acidity down until the cup goes flat. If you want acidity to show, keeping alkalinity low is the key move." },
    ],
  },
  "sensory-cupping": {
    title: "Sensory — Turning Perception into Language and Score",
    tagline: "Cupping, brewed and espresso evaluation protocols and their scoresheets",
    description:
      "The SCA cupping protocol and how to read a cupping form; how expectations differ by processing method; the WBrC brewed tasting and WBC espresso tasting protocols; and what each scoresheet line is really asking of the taster.",
    keywords: ["coffee cupping", "SCA cupping protocol", "cupping form", "CVA", "sensory evaluation", "WBrC scoresheet", "WBC sensory", "coffee tasting"],
    faq: [
      { q: "How is cupping different from evaluating a brew?",
        a: "Cupping fixes grind, water temperature, ratio and time so that several coffees can be compared side by side under standard conditions. Brewed evaluation does the opposite: it judges the result of the recipe that shows that coffee at its best. A coffee that scored well on the cupping table is not guaranteed to be good as a pour-over or as espresso." },
      { q: "Should the criteria change with processing method?",
        a: "The axes stay the same; the expectations differ. From Washed you look for cleanliness and transparent acidity; from Natural, fruit character, sweetness and body. When you cannot tell whether a Natural's fermentative note is a defect or an intention, judge it on whether cleanliness, balance and a pleasant aftertaste hold up." },
      { q: "How is a cupping score arrived at?",
        a: "The SCA method scores individual attributes — fragrance/aroma, flavour, aftertaste, acidity, body, balance, uniformity, clean cup, sweetness, overall — and subtracts for defects. The newer CVA separates descriptive assessment from preference, so that what you perceive and how much you like it are recorded independently." },
    ],
  },
  "brewing-technique": {
    title: "Brewing Technique — Tools, Flow Rate, Methods",
    tagline: "Percolation and immersion, ribs and paper, and how a recipe is designed",
    description:
      "Why cones and flat bottoms are both percolation brewers; how hybrids such as the Hario Switch and Clever separate grind size from contact time; what ribs and filter papers actually do to flow rate; and the design logic behind the 4:6 and Chanho-Tornado recipes.",
    keywords: ["pour over", "V60", "Kalita Wave", "Hario Switch", "Clever dripper", "immersion dripper", "coffee filter paper", "4:6 method", "Chanho-Tornado", "flow rate", "turbulence"],
    faq: [
      { q: "How do cone and flat-bottom drippers differ?",
        a: "Both are percolation brewers — water passes through — and what differs is the geometry of the bed. A cone converges the water toward the centre, so the bed is deep and flow is fast, giving more control over variables but making the result sensitive to pouring skill. A flat bottom lets water pass broad and shallow, which is more even, more forgiving and more repeatable." },
      { q: "Why can a hybrid immersion dripper taste strong at a coarse grind?",
        a: "In pure percolation the only real way to extend contact time is to grind finer, and finer grinding brings more fines, over-extraction and clogging with it. A hybrid closes a valve and so separates contact time from grind size: the valve buys the time, which lets you grind coarser and cut the fines." },
      { q: "Does a thicker filter paper slow the brew down?",
        a: "It does not follow. CAFEC's own published specifications show the thinnest paper (T-92) as slow and the thickest (T-90) as fast. Flow is governed by the crepe structure and the fibre stock rather than by thickness — in one measurement, changing only the paper in the same dripper more than doubled the flow rate." },
    ],
  },
  "espresso-technique": {
    title: "Espresso Technique — Dosing, Distribution, Tamping, Machine",
    tagline: "Puck preparation decides most of the result",
    description:
      "What dosing, distribution, levelling and tamping each control; the physical cause of channelling; and what pressure, temperature and pre-infusion actually change — with the pressure-and-crema relationship set out against the measured research.",
    keywords: ["espresso extraction", "dosing", "distribution", "tamping", "channelling", "pre-infusion", "espresso pressure", "crema", "portafilter"],
    faq: [
      { q: "Does raising the pressure produce more crema?",
        a: "Yes. In a study comparing 7, 9 and 11 bar, foam volume rose from 5.1 mL to 6.9 mL. But persistence barely changed, and sensory quality was best at 9 bar. If more crema is the goal, freshness is a far stronger lever than pressure — the difference CO₂ content makes is about 4.8×, against pressure's 1.35×." },
      { q: "Are distribution and levelling the same thing?",
        a: "No. Distribution is getting the grounds spread evenly through the basket, horizontally and vertically. Levelling is making the surface flat. A flat surface over a clumped interior still channels, so levelling on its own is not enough." },
      { q: "Why does pre-infusion work?",
        a: "Wetting the coffee slowly at low pressure before full pressure arrives lets the puck swell evenly and cushions small differences in density. Channelling — water finding one path — drops as a result and extraction rises more evenly. It is the same principle as the bloom in filter brewing." },
    ],
  },
  "milk-technique": {
    title: "Milk Technique — Steaming, Texturing, Pouring",
    tagline: "Air in briefly; refine it for a long time",
    description:
      "Steaming (frothing) explained as two phases — stretching, which introduces air, and rolling, which breaks it down — plus the textural differences between cappuccino, latte and flat white, temperature management, and why pouring changes the taste.",
    keywords: ["milk steaming", "frothing", "microfoam", "latte art", "stretching", "rolling", "flat white", "cappuccino", "milk temperature"],
    faq: [
      { q: "What ratio of stretching to rolling should I use?",
        a: "The MTSPACE standard is 15% stretching to 85% rolling. A few seconds of air is enough; introduce it for longer and you get large bubbles that will not pour. The rest of the time should go into refining that air by rotation, which is what produces smooth microfoam." },
      { q: "What separates a cappuccino, a latte and a flat white?",
        a: "The volume of milk and the depth of the foam. A cappuccino carries thick foam; a flat white has thin, dense microfoam and a lower milk ratio so the coffee stays present; a latte sits between them with the highest proportion of milk. From the same pitcher you control this with stretching time and cup size." },
      { q: "How hot should the milk be?",
        a: "Take it too high and the proteins denature: sweetness disappears and a cooked note appears. Stop while the sweetness of the lactose still reads, and finish slightly below your target — the temperature continues to rise a little while you pour." },
    ],
  },
  "roasting": {
    title: "Roasting — Designing the Potential for Flavour",
    tagline: "Temperature decides what appears; time decides how strongly",
    description:
      "How to read the old SCAA flavour wheel as a roasting map; the separation of the temperature axis (composition) from the time axis (intensity); the STLT–LTHT quadrants; and filter, espresso and omni roasting redefined by spectrum and brewing amplification rather than by degree of roast.",
    keywords: ["coffee roasting", "flavour wheel", "Maillard reaction", "first crack", "development", "roast profile", "filter roasting", "espresso roasting", "omni roasting", "blending"],
    faq: [
      { q: "Is it right that filter means light and espresso means dark?",
        a: "That is one cross-section of the outcome, not its cause. What matters is which flavour spectrum the roast created, and how much that spectrum is amplified by the brewing method. Espresso extracts a lot in a short time and so acts as an amplifier; filter is a gentle carrier. That is why the same coffee sounds different through the two." },
      { q: "Why still study the old flavour wheel?",
        a: "The new wheel is a vocabulary for what you perceive now; the old wheel says why that aroma is there at all. Enzymatic aromas are already present in the green bean and are what remains once roasting has driven them off, while Sugar Browning and Dry Distillation are what roasting creates. The order in which the colours darken from top to bottom is the order in which roasting proceeds." },
      { q: "Do darker roasts extract more?",
        a: "Rate and yield have to be separated. As roasting proceeds the structure becomes porous and the rate of extraction rises — but beyond roughly 12–14% mass loss the soluble compounds themselves break down and the ceiling of extraction yield comes down. A deep roast does not give more; it gives a smaller amount faster." },
    ],
  },
  "variable-correlation": {
    title: "Correlation — Variables Trade Against Each Other",
    tagline: "Change one and something else always moves with it",
    description:
      "How the seven brewing variables offset and amplify one another; the procedure for predicting a result and then verifying it; which levers control taste and which control texture; and whether to suspect the green coffee, the roast or the barista first.",
    keywords: ["brewing variables", "extraction correlation", "balancing", "controlling coffee taste", "texture", "extraction prediction", "coffee priority"],
    faq: [
      { q: "What else changes when I grind finer?",
        a: "Surface area rises and so does yield — but flow slows, contact time lengthens and fines increase at the same time. One adjustment moves at least three things. That is why variables have to be changed one at a time, with the rest held fixed, if you want to isolate a cause." },
      { q: "When a cup falls flat, where do I look first — green, roast or brew?",
        a: "Upstream first. Green coffee sets the ceiling on cup quality, roasting turns that potential into actual flavour, and the barista translates it into the cup. A later stage cannot exceed the ceiling of an earlier one, so no amount of adjusting brew variables will create an axis that is not there." },
      { q: "How do I go about balancing a cup?",
        a: "There are three levels: by extraction (yield and strength), by roasting (the width of the spectrum and where it lands), and by controlling individual variables. Decide which level the problem belongs to before adjusting; pick the wrong level and every adjustment moves you further away." },
    ],
  },
  "integration-application": {
    title: "Integration & Application — From Analysis to Development",
    tagline: "Read the green and the roasted coffee; develop it through roasting and brewing",
    description:
      "Quantitative and qualitative analysis of green and roasted coffee, the give-and-take between roasting and brewing, and the conditions that make flavour and texture better — brought together into one working sequence.",
    keywords: ["green coffee analysis", "roasted coffee analysis", "water content", "bean density", "coffee texture", "flavour development", "roasting and brewing"],
    faq: [
      { q: "What does quantitative analysis of green coffee actually measure?",
        a: "Measurable values: water content, density, screen size, water activity, defect count. These are what tell you how to roast — high water content means more energy is needed through the drying phase, high density means heat struggles to reach the core." },
      { q: "Are flavour and texture controlled by the same levers?",
        a: "No. Taste is made mostly on the yield axis; texture is made on the particle, filter and strength axes. That is why states like 'good flavour but thin' or 'thick but hollow' exist, and each needs a different correction." },
      { q: "What actually improves texture?",
        a: "Preserving lipids and polysaccharides appropriately, avoiding excessive fines, choosing the filter for the purpose (metal for body, paper for clarity), and keeping strength in the right range. The goal of texture is not 'heavy' but 'cleanly filled'." },
    ],
  },
  "quality-control": {
    title: "Quality Control — Turning Luck into Control",
    tagline: "Can you make that good cup again?",
    description:
      "Quality control split into its two purposes — improving and maintaining — with what to measure among time, temperature, environment, instruments and brewing method, at what interval, and in what order to suspect things when something goes wrong.",
    keywords: ["coffee quality control", "QC", "roastery QC", "brewing reproducibility", "TDS measurement", "coffee SOP", "cupping routine"],
    faq: [
      { q: "What should be measured first in QC?",
        a: "Whatever is least reproducible. Usually that is time and temperature, then environment (humidity, room temperature) and the state of your instruments. If the brewing method itself is not fixed as an SOP, every other measurement loses its meaning." },
      { q: "Do I need to cup every day?",
        a: "It depends on the purpose. If the purpose is maintenance, a short spot-check on the same reference coffee is enough; if it is improvement, you need a controlled comparative cupping. What matters is less the frequency than the existence of a baseline — without something to compare against, change cannot be detected." },
      { q: "What does measuring TDS tell me?",
        a: "It tells you strength, and combined with dose and beverage mass it lets you calculate yield. What matters more than the absolute number is the comparison against your own baseline for the same coffee on the same equipment. Putting perception next to figures narrows 'why does it taste like this' from a guess to a diagnosis." },
    ],
  },
  "roastery-setup": {
    title: "Roastery Setup — The Infrastructure Beneath Flavour",
    tagline: "Heat, exhaust, power, gas and workflow constrain the profile",
    description:
      "Judging the minimum heat a given roaster capacity requires; designing exhaust, electrical supply, gas and working flow; and verifying in reverse — from development at first crack and energy allocation — whether the installation is actually adequate.",
    keywords: ["opening a roastery", "roaster installation", "exhaust design", "roaster heat capacity", "roastery workflow", "coffee roaster setup"],
    faq: [
      { q: "How do I know whether a roaster has enough heat?",
        a: "With the machine fully pre-heated, drop a normal batch: if the RoR climbs to first crack without stalling or reversing, the heat is sufficient. If the RoR collapses mid-roast, either the batch size has to come down or you need more burner headroom." },
      { q: "Why does exhaust matter so much?",
        a: "Exhaust is both the route out for smoke, chaff and heat and the lever that regulates convective heat transfer. High exhaust resistance restricts airflow and undermines roast reproducibility, and accumulated chaff is a fire risk. Keep the flue wide enough, minimise bends, and clean it on a schedule." },
      { q: "Can I do the installation work myself?",
        a: "No. Electrical, gas and exhaust work must without exception be carried out by a licensed contractor to the statutory standards. This chapter is a conceptual frame; specific capacities and specifications must follow the equipment manual and local regulations." },
    ],
  },
  "wbc-barista-championship": {
    title: "WBC — World Barista Championship",
    tagline: "Read the rules, build a concept, make a routine",
    description:
      "How to prioritise and decompose the WBC Rules & Regulations, what the Sensory, Technical and Head Judge scoresheets are really asking, how evaluation and competition operations work, and the path from research through concept to a finished routine.",
    keywords: ["WBC", "World Barista Championship", "barista competition", "WBC rules", "WBC scoresheet", "signature beverage", "competition preparation"],
    faq: [
      { q: "Where does competition preparation start?",
        a: "With the Rules & Regulations. The rules define the structure of the score, so you decompose them first to see where points come from and where deductions arise. Coffee selection and concept come afterwards — a routine built without knowing the rules usually has to be built again." },
      { q: "Which part of the scoresheet matters most?",
        a: "By allocation, Sensory carries the most. In practice, though, rankings turn on managing deductions on the Technical and Head Judge sheets. Sensory is hard to raise and varies between judges, whereas station management, timing and procedure can be brought under reliable control by training." },
      { q: "Do the rules change every year?",
        a: "They do. This material is written against the 2026 WBC rules, and anyone preparing should check the current official R&R for that year. Items subject to revision are marked [to verify] in the text." },
    ],
  },
  "wbrc-brewers-cup": {
    title: "WBrC — World Brewers Cup",
    tagline: "A competition explained in a single cup",
    description:
      "The structure of the WBrC rules and of Compulsory and Open Service, the Sensory and Head Judge scoresheets, evaluation and operations, and the path from coffee, water and technique research through to concept and routine development.",
    keywords: ["WBrC", "World Brewers Cup", "brewers cup", "WBrC rules", "open service", "compulsory service", "brewing competition", "competition water"],
    faq: [
      { q: "How does WBrC differ from WBC?",
        a: "WBC asks for three beverages — espresso, milk and signature — while WBrC is contested with one filter coffee. WBrC splits into Compulsory Service, using coffee supplied by the organisers, and Open Service, using coffee you bring. With fewer variables in play, coffee selection and water design carry far more weight." },
      { q: "Why is water so important in the Brewers Cup?",
        a: "The cup is 98% water, and because the competition allows wide freedom in equipment and recipe, water is the large remaining variable. Total hardness is used to design extracting power and alkalinity to buffer acids, while the ratio of magnesium to calcium adjusts which axis is brought forward." },
      { q: "How is an Open Service coffee chosen?",
        a: "Rarity alone is not enough; it needs a narrative and it needs to be reproducible. It must be clear what the judges are meant to perceive in that coffee, and that flavour has to come back reliably under competition-day conditions. Competitors often work directly with the producer to secure a small high-quality lot." },
    ],
  },
};
