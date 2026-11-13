import { capabilityLabels, cuisineLabels, mealTypeLabels, timeBucketLabels } from "@/lib/labels";
import type { AiSuggestRequest } from "@/lib/schemas/ai";

// Server-side prompt builder for /api/ai/suggest.

export const SYSTEM_INSTRUCTION = `أنت طاهٍ منزلي خبير بالمطبخ السوري والشامي والعربي والعالمي، تساعد شخصاً يسأل: «ماذا أطبخ بما عندي في البيت؟».

القواعد:
- اقترح وصفات حقيقية ومعروفة أو تنويعات منطقية عليها، لا وصفات مختلقة غريبة.
- اعتمد قدر الإمكان على المكونات المتوفرة فقط. يُسمح بمكوّن أو مكوّنين إضافيين كحد أقصى في كل وصفة، ويجب أن يكونا شائعين.
- الماء لا يُذكر ضمن المكونات.
- اكتب أسماء المكونات المتوفرة بالصيغة نفسها الواردة في القائمة حرفياً. المكوّن غير الموجود في القائمة اكتبه باسمه العربي الشائع.
- course = "main" للطبق الأساسي، "appetizer" للمقبلات والسلطات والأطباق الجانبية، "dessert" للحلويات.
- role = "required" للمكونات التي لا تقوم الوصفة بدونها، و"optional" للتزيين والإضافات.
- استعمل فقط الأدوات المتوفرة في equipment، واذكر الأدوات الضرورية فقط.
- كل النصوص بالعربية الفصحى المبسطة. الخطوات قصيرة وواضحة ومرتبة (من 3 إلى 7 خطوات).
- prepMinutes و cookMinutes واقعية بالدقائق. الكميات أرقام مع وحدة من القائمة المسموحة.
- لا تكرر أي وصفة من قائمة «وصفات موجودة مسبقاً»، ولا تكرر وصفة داخل الإجابة.
- أجب بصيغة JSON فقط حسب المخطط المطلوب.`;

export function buildUserPrompt(request: AiSuggestRequest): string {
  const lines: string[] = [
    `اقترح ${request.count} وصفات مختلفة.`,
    "",
    `المكونات المتوفرة: ${request.ingredients.join("، ")}`,
    `الأدوات المتوفرة: ${
      request.equipment.length > 0
        ? request.equipment.map((cap) => `${cap} (${capabilityLabels[cap]})`).join("، ")
        : "لا شيء — وصفات بلا طبخ فقط"
    }`,
  ];

  if (request.timeBucket) {
    const bucket = timeBucketLabels[request.timeBucket];
    lines.push(`المدة المطلوبة (تحضير + طبخ): ${bucket.label} — ${bucket.hint}`);
  }
  if (request.cuisine) lines.push(`المطبخ المطلوب: ${cuisineLabels[request.cuisine].label} (${request.cuisine})`);
  if (request.mealType) lines.push(`نوع الوجبة المطلوب: ${mealTypeLabels[request.mealType].label} (${request.mealType})`);
  if (request.exclude.length > 0) {
    lines.push("", `وصفات موجودة مسبقاً (لا تكررها): ${request.exclude.join("، ")}`);
  }

  return lines.join("\n");
}
