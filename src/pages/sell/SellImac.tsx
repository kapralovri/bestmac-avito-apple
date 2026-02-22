import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImage from "@/assets/images/hero-apple-devices.jpg";

const SellImac = () => {
    return (
        <SellDeviceLanding
            deviceType="iMac"
            title="Продать iMac в Москве дорого | Скупка аймак б/у — BestMac"
            h1="Скупка iMac в Москве дорого"
            description="Оцените ваш Apple iMac онлайн за 5 минут. Покупаем моноблоки 21.5, 24 и 27 дюймов на процессорах Intel и M1/M3. Выезд оценщика, деньги сразу!"
            keywords="продать imac, скупка imac москва, выкуп аймак дорого, продать imac 24 m1, скупка imac 27"
            heroImage={heroImage}
            modelsBought={[
                "iMac 24\" (M1, M3)",
                "iMac 27\" (Retina 5K, Intel)",
                "iMac 21.5\" (Retina 4K, Intel)",
                "iMac Pro 27\""
            ]}
        />
    );
};

export default SellImac;
