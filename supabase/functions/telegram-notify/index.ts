const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HotDeal {
  // From main parser
  model_name?: string;
  processor?: string;
  ram?: number;
  ssd?: number;
  // From hot deals scanner
  model?: string;
  title?: string;
  // Common fields
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

Deno.serve(async (req) => {
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
      
      // Determine model name (from scanner or main parser)
      const modelName = deal.model || deal.model_name || "MacBook";
      const hasSpecs = deal.processor && deal.ram && deal.ssd;
      
      let message: string;
      
      if (hasSpecs) {
        // Full specs from main parser
        message = `🔥 <b>Горячее предложение!</b>

📱 <b>${modelName}</b>
⚙️ ${deal.processor} / ${deal.ram}GB / ${formatSsd(deal.ssd!)}

💰 Цена: <b>${formatPrice(deal.price)}</b>
📊 Медиана рынка: ${formatPrice(deal.median_price)}
📉 Скидка: <b>-${discountText}%</b>

🏷 Выгода: ${formatPrice(deal.median_price - deal.price)}`;
      } else {
        // From hot deals scanner (less details)
        const title = deal.title || modelName;
        message = `🔥 <b>Горячее предложение!</b>

📱 <b>${modelName}</b>
📝 ${title.length > 60 ? title.substring(0, 60) + '...' : title}

💰 Цена: <b>${formatPrice(deal.price)}</b>
📊 Медиана рынка: ${formatPrice(deal.median_price)}
📉 Скидка: <b>-${discountText}%</b>

🏷 Выгода: ${formatPrice(deal.median_price - deal.price)}`;
      }

      const inlineKeyboard = {
        inline_keyboard: [
          [{ text: "📲 Открыть объявление", url: deal.url }],
          [{ text: "💬 Связаться с BestMac", url: "https://t.me/romanmanro" }]
        ]
      };

      const sent = await sendTelegramMessage(botToken, chatId, message, inlineKeyboard);
      if (sent) {
        successCount++;
        console.log(`✓ Sent notification for ${modelName}`);
      } else {
        console.error(`✗ Failed to send notification for ${modelName}`);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
