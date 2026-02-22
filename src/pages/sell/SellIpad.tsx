import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImg from "@/assets/images/hero-apple-devices.jpg";

const SellIpad = () => {
    return (
        <SellDeviceLanding
            deviceType="iPad"
            title="Продать iPad в Москве дорого | Скупка айпадов б/у — BestMac"
            description="Скупка планшетов Apple iPad: Pro, Air, Mini. Оценка онлайн за 5 минут в Telegram/WhatsApp. Моментальная выплата. Выкупаем в любом состоянии."
            h1="Скупка iPad в Москве дорого"
            keywords="продать ipad, скупка айпада москва, продать планшет apple дорого, продать ipad pro"
            modelsBought={[
                "iPad Pro (11 дюймов и 12.9 дюймов)",
                "iPad Air (последние поколения)",
                "iPad (базовые версии от 8 поколения)",
                "iPad mini (от 5 поколения)",
                "Apple Pencil и Magic Keyboard"
            ]}
            heroImage={heroImg}
        />
    );
};

export default SellIpad;
