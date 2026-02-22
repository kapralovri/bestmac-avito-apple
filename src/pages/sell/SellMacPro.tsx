import SellDeviceLanding from "@/components/SellDeviceLanding";
import heroImage from "@/assets/images/hero-apple-devices.jpg";

const SellMacPro = () => {
    return (
        <SellDeviceLanding
            deviceType="Mac Pro"
            title="Продать Mac Pro в Москве дорого | Выкуп рабочих станций Apple"
            h1="Скупка Mac Pro в Москве"
            description="Продайте ваш Mac Pro быстро и дорого. Выкупаем профессиональные станции Apple (Trashcan, Tower) на процессорах Intel и Apple Silicon. Оценка за 5 минут!"
            keywords="продать mac pro, скупка mac pro москва, выкуп apple mac pro, продать рабочей станции apple"
            heroImage={heroImage}
            modelsBought={[
                "Mac Pro (Apple Silicon M2 Ultra)",
                "Mac Pro (Tower, 2019)",
                "Mac Pro (Trashcan, Late 2013)"
            ]}
        />
    );
};

export default SellMacPro;
