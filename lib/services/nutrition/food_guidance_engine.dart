import '../../models/allergy.dart';
import '../../models/condition.dart';
import '../../models/medicine.dart';

class FoodRecommendationCategory {
  final String title;
  final List<String> items;
  final String rationale;
  final bool isWarning;

  FoodRecommendationCategory({
    required this.title,
    required this.items,
    required this.rationale,
    this.isWarning = false,
  });
}

class FoodGuidanceResult {
  final List<FoodRecommendationCategory> recommended;
  final List<FoodRecommendationCategory> limitOrAvoid;
  final List<String> questionsForDoctor;
  final String clinicalDisclaimer;
  final List<String> matchedContextReasons;

  FoodGuidanceResult({
    required this.recommended,
    required this.limitOrAvoid,
    required this.questionsForDoctor,
    required this.clinicalDisclaimer,
    required this.matchedContextReasons,
  });
}

class FoodGuidanceEngine {
  static Future<FoodGuidanceResult> generateGuidance({
    required List<ConditionEntity> conditions,
    required List<MedicineEntity> medicines,
    required List<AllergyEntity> allergies,
  }) async {
    final recommended = <FoodRecommendationCategory>[];
    final limitOrAvoid = <FoodRecommendationCategory>[];
    final questions = <String>[];
    final matchedReasons = <String>[];

    final conditionNames = conditions.map((c) => c.name.toLowerCase()).toList();
    final medNames = medicines.map((m) => '${m.name} ${m.genericName}'.toLowerCase()).toList();
    final allergyNames = allergies.map((a) => a.allergen.toLowerCase()).toList();

    // 1. Post-Surgical / Recovery Diet
    if (conditionNames.any((c) => c.contains('post-op') || c.contains('surgery') || c.contains('append') || c.contains('cholecyst'))) {
      matchedReasons.add('Recent post-operative recovery context');
      recommended.add(
        FoodRecommendationCategory(
          title: 'Gentle Digestion & Healing Foods',
          items: [
            'Warm vegetable broths and clear soups',
            'Soft cooked rice with moong dal (khichdi)',
            'Steamed vegetables (carrots, bottle gourd, pumpkin)',
            'Plenty of boiled/purified water (sipped throughout the day)',
          ],
          rationale: 'Promotes gentle gastrointestinal motility and tissue repair without straining surgical incision areas.',
        ),
      );
      limitOrAvoid.add(
        FoodRecommendationCategory(
          title: 'Heavy, Oily & Gas-Forming Items',
          items: [
            'Deep fried foods, samosas, pakoras',
            'High-fat dairy and heavy cream dishes',
            'Excessive cruciferous vegetables (raw cabbage, cauliflower)',
            'Carbonated sodas and highly spicy masalas',
          ],
          rationale: 'Minimizes abdominal distension, gas cramps, and nausea during early incision recovery.',
          isWarning: true,
        ),
      );
      questions.add('When can I transition from soft post-op diet to regular home food?');
    }

    // 2. Hypertension / Cardiovascular Guidance
    if (conditionNames.any((c) => c.contains('hypertension') || c.contains('blood pressure') || c.contains('cardiac') || c.contains('cad')) ||
        medNames.any((m) => m.contains('telmisartan') || m.contains('losartan') || m.contains('amlodipine') || m.contains('metoprolol'))) {
      matchedReasons.add('Cardiovascular / Blood Pressure management context');
      recommended.add(
        FoodRecommendationCategory(
          title: 'Heart-Healthy & Potassium-Balanced Options',
          items: [
            'Fresh fruits (apples, berries, pomegranates, guava)',
            'Whole grains (oats, brown rice, ragi, whole wheat rotis)',
            'Handful of unsalted almonds and walnuts',
            'Leafy greens and legumes rich in natural magnesium',
          ],
          rationale: 'Supports arterial flexibility and balanced blood pressure regulation.',
        ),
      );
      limitOrAvoid.add(
        FoodRecommendationCategory(
          title: 'High-Sodium & Processed Items',
          items: [
            'Pickles (achaar), papad, and salted chips',
            'Canned soups, instant noodles, and preserved meats',
            'Extra table salt additions during meals (target < 2g sodium/day)',
          ],
          rationale: 'Excess sodium increases fluid retention and raises vascular resistance.',
          isWarning: true,
        ),
      );
      questions.add('What is my daily sodium and fluid intake recommendation?');
    }

    // 3. Diabetes / Blood Glucose Guidance
    if (conditionNames.any((c) => c.contains('diabetes') || c.contains('glucose') || c.contains('hba1c') || c.contains('sugar')) ||
        medNames.any((m) => m.contains('metformin') || m.contains('glimepiride') || m.contains('insulin'))) {
      matchedReasons.add('Glycemic / Diabetes management context');
      recommended.add(
        FoodRecommendationCategory(
          title: 'Low Glycemic Index & High Fiber',
          items: [
            'Millets (jowar, bajra, foxtail millet)',
            'Sprouted lentils and legumes (chana, green gram)',
            'Bitter gourd (karela), methi leaves, cucumber',
            'Unsweetened curd or plain buttermilk',
          ],
          rationale: 'Steadies post-prandial blood glucose and improves insulin sensitivity.',
        ),
      );
      limitOrAvoid.add(
        FoodRecommendationCategory(
          title: 'Simple Sugars & Refined Carbs',
          items: [
            'Sweets (mithai), jaggery, white sugar, syrups',
            'Fruit juices without fiber, energy drinks',
            'Refined flour bakery items (maida bread, pastries)',
          ],
          rationale: 'Rapidly absorbed sugars cause acute blood glucose spikes.',
          isWarning: true,
        ),
      );
      questions.add('How should my meal timing align with my medication schedule?');
    }

    // 4. Blood Thinner / Anticoagulant Food Interactions
    if (medNames.any((m) => m.contains('warfarin') || m.contains('aspirin') || m.contains('clopidogrel') || m.contains('ecosprin'))) {
      matchedReasons.add('Antiplatelet / Anticoagulant medication context');
      limitOrAvoid.add(
        FoodRecommendationCategory(
          title: 'Medication Interaction Watch (Vitamin K Consistency)',
          items: [
            'Avoid sudden large shifts in dark green leafy intake (kale, spinach)',
            'Avoid high-dose Ginkgo Biloba, garlic extracts, or St. John\'s Wort',
            'Avoid excessive alcohol intake',
          ],
          rationale: 'Maintains consistent INR/clotting parameters and prevents sudden changes in bleeding risk.',
          isWarning: true,
        ),
      );
      questions.add('Are there specific dietary supplements or herbs I should avoid with my blood thinners?');
    }

    // 5. Documented Allergies
    if (allergyNames.isNotEmpty) {
      matchedReasons.add('Documented allergy cross-reactivity check');
      for (var allergy in allergies) {
        limitOrAvoid.add(
          FoodRecommendationCategory(
            title: 'Known Allergen Alert: ${allergy.allergen}',
            items: [
              'Strictly check food labels for hidden ${allergy.allergen}',
              'Avoid cross-contaminated culinary preparation surfaces',
            ],
            rationale: 'Severe allergy reaction prevention (${allergy.reaction} - ${allergy.severity}).',
            isWarning: true,
          ),
        );
      }
    }

    // Fallback if empty health record
    if (recommended.isEmpty) {
      recommended.add(
        FoodRecommendationCategory(
          title: 'General Well-Balanced Nutrition',
          items: [
            'Diverse colorful vegetables and whole fruits',
            'Whole grains, lentils, and lean proteins',
            'Adequate daily hydration (2-3 liters water)',
          ],
          rationale: 'Supports general metabolic vitality and immune health.',
        ),
      );
      limitOrAvoid.add(
        FoodRecommendationCategory(
          title: 'General Items to Moderate',
          items: [
            'Highly processed fast foods and deep fried items',
            'Excessive refined sugar and sweetened drinks',
          ],
          rationale: 'Promotes general cardiovascular and metabolic longevity.',
        ),
      );
      questions.add('What dietary routine is best suited for my overall recovery goals?');
    }

    const disclaimer =
        'Disclaimer: This nutrition information is educational general guidance derived from your recorded health conditions and medications on this device. It is not a clinical diet prescription. Please consult your physician or registered dietitian before making significant dietary changes.';

    return FoodGuidanceResult(
      recommended: recommended,
      limitOrAvoid: limitOrAvoid,
      questionsForDoctor: questions,
      clinicalDisclaimer: disclaimer,
      matchedContextReasons: matchedReasons,
    );
  }
}
