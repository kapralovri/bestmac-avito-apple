import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HotDeal {
  model_name: string;
  processor: string;
  ram: number;
  ssd: number;
  price: number;
  median_price: number;
  discount_percent: number;
  url: string;
}

interface NotifyRequest {
  deals: HotDeal[];
}

function formatSsd(ssd: number): string {
  return ssd >= 1024 ? `${ssd / 1024}TB` : `${ssd}GB`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string, replyMarkup?: object): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    console.log("Telegram response:", result);
    return result.ok;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(
        JSON.stringify({ error: "Telegram credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { deals }: NotifyRequest = await req.json();

    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No deals to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${deals.length} hot deals...`);

    let successCount = 0;

    for (const deal of deals) {
      const discountText = deal.discount_percent.toFixed(0);
      
      const message = `🔥 <b>Горячее предложение!</b>

📱 <b>${deal.model_name}</b>
⚙️ ${deal.processor} / ${deal.ram}GB / ${formatSsd(deal.ssd)}

💰 Цена: <b>${formatPrice(deal.price)}</b>
📊 Медиана рынка: ${formatPrice(deal.median_price)}
📉 Скидка: <b>-${discountText}%</b>

🏷 Выгода: ${formatPrice(deal.median_price - deal.price)}`;

      const inlineKeyboard = {
        inline_keyboard: [
          [{ text: "📲 Открыть объявление", url: deal.url }],
          [{ text: "💬 Связаться с BestMac", url: "https://t.me/romanmanro" }]
        ]
      };

      const sent = await sendTelegramMessage(botToken, chatId, message, inlineKeyboard);
      if (sent) {
        successCount++;
        console.log(`✓ Sent notification for ${deal.model_name}`);
      } else {
        console.error(`✗ Failed to send notification for ${deal.model_name}`);
      }

      // Delay between messages to avoid Telegram rate limits
      if (deals.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: deals.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in telegram-notify:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
