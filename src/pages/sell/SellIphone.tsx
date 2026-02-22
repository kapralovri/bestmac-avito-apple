import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImg from "@/assets/images/hero-apple-devices.jpg"; // Можно заменить на специфичное фото iPhone, если есть

const SellIphone = () => {
    return (
        <SellDeviceLanding
            deviceType="iPhone"
            title="Продать iPhone в Москве дорого | Скупка айфонов б/у — BestMac"
            description="Скупка iPhone: 16, 15, 14, 13, 12, 11 Pro Max. Оценка онлайн за 5 минут в Telegram/WhatsApp. Моментальная выплата наличными. Принимаем разбитые и сломанные."
            h1="Скупка iPhone в Москве дорого"
            keywords="продать iphone, скупка айфонов москва, продать айфон дорого, продать iphone б/у, сдать айфон"
            modelsBought={[
                "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max",
                "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max",
                "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max",
                "iPhone 13 / 13 mini / 13 Pro / 13 Pro Max",
                "iPhone 12 / 12 mini / 12 Pro / 12 Pro Max",
                "iPhone 11 / 11 Pro / 11 Pro Max"
            ]}
            heroImage={heroImg}
        />
    );
};

export default SellIphone;
