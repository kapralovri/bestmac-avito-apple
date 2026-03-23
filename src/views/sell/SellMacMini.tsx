import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImage from "@/assets/images/hero-apple-devices.jpg";

const SellMacMini = () => {
    return (
        <SellDeviceLanding
            deviceType="Mac mini"
            title="Продать Mac mini в Москве | Скупка Mac mini дорого — BestMac"
            h1="Быстрая скупка Mac mini"
            description="Онлайн оценка Mac mini за 5 минут. Покупаем компактные десктопы Apple на процессорах Intel, M1 и M2/M4. Платим реальную рыночную цену."
            keywords="продать mac mini, скупка mac mini, выкуп mac mini москва, продать мак мини бу"
            heroImage={heroImage}
            modelsBought={[
                "Mac mini (M2, M2 Pro, M4)",
                "Mac mini (M1, 2020)",
                "Mac mini (Intel Core i5/i7, 2018)"
            ]}
        />
    );
};

export default SellMacMini;
