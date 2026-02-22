import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImg from "@/assets/images/hero-apple-devices.jpg";

const SellWatch = () => {
    return (
        <SellDeviceLanding
            deviceType="Apple Watch"
            title="Продать Apple Watch в Москве дорого | Скупка часов Apple — BestMac"
            description="Скупка умных часов Apple Watch: Ultra, Series 10, 9, 8, 7, SE. Оценка онлайн за 5 минут в Telegram/WhatsApp. Быстрая выплата наличными."
            h1="Скупка Apple Watch в Москве дорого"
            keywords="продать apple watch, скупка эпл вотч москва, продать часы apple дорого, продать apple watch ultra"
            modelsBought={[
                "Apple Watch Ultra / Ultra 2",
                "Apple Watch Series 10 / 9 / 8",
                "Apple Watch Series 7",
                "Apple Watch SE (1-го и 2-го поколения)",
            ]}
            heroImage={heroImg}
        />
    );
};

export default SellWatch;
