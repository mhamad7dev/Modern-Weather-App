// تنفيذ البحث عن المدينة عند الضغط على Enter
document.getElementById('searchInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchCity();
            }
        });

        // تحديد موقع الزائر تلقائياً أو عرض طقس دمشق كخيار افتراضي
        window.addEventListener('DOMContentLoaded', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        getWeatherByCoordinates(lat, lon, "موقعك الحالي");
                    },
                    error => {
                        getWeatherByCoordinates(33.5138, 36.2765, "دمشق");
                    }
                );
            } else {
                getWeatherByCoordinates(33.5138, 36.2765, "دمشق");
            }
        });

        // البحث عن المدينة وتحويل اسمها إلى إحداثيات جغرافية
        async function searchCity() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;

            showStatus("جاري البحث عن المدينة...", false);

            try {
                const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ar&format=json`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const city = data.results[0];
                    const cityName = city.name + (city.country ? `, ${city.country}` : '');
                    getWeatherByCoordinates(city.latitude, city.longitude, cityName);
                    hideStatus();
                } else {
                    showStatus("لم يتم العثور على المدينة المطلوبة. تأكد من صحة الاسم.", true);
                }
            } catch (err) {
                showStatus("حدث خطأ أثناء الاتصال بالخادم.", true);
            }
        }

        // جلب بيانات الطقس الحالية والتوقعات حسب الإحداثيات
        async function getWeatherByCoordinates(lat, lon, cityName) {
            showStatus("جاري جلب بيانات الطقس الحقيقي...", false);

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
                
                const response = await fetch(url);
                const data = await response.json();

                updateUI(data, cityName);
                hideStatus();
            } catch (err) {
                showStatus("فشل في تحميل بيانات الطقس.", true);
            }
        }

        // تحديث واجهة الصفحة ببيانات الطقس الحالية
        function updateUI(data, cityName) {
            const current = data.current;
            const daily = data.daily;

            document.getElementById('cityName').textContent = cityName;
            document.getElementById('currentTemp').textContent = `${Math.round(current.temperature_2m)}°`;
            document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°`;
            document.getElementById('minTemp').textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
            document.getElementById('maxTemp').textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
            document.getElementById('windSpeed').textContent = `${current.wind_speed_10m} كم/س`;
            document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
            document.getElementById('pressure').textContent = `${current.surface_pressure} hPa`;
            document.getElementById('uvIndex').textContent = daily.uv_index_max ? daily.uv_index_max[0] : 'غير متوفر';

            const weatherInfo = getWeatherDescription(current.weather_code, current.is_day);
            document.getElementById('weatherDesc').textContent = weatherInfo.text;
            document.getElementById('weatherIconContainer').innerHTML = `<i class="${weatherInfo.icon}"></i>`;

            updateHourlyForecast(data.hourly);

            updateDailyForecast(data.daily);
        }

        // إنشاء بطاقات توقعات الساعات القادمة
        function updateHourlyForecast(hourly) {
            const container = document.getElementById('hourlyContainer');
            container.innerHTML = '';

            const currentHourIndex = new Date().getHours();
            for (let i = currentHourIndex; i < currentHourIndex + 24; i += 2) {
                if (!hourly.time[i]) break;

                const timeStr = new Date(hourly.time[i]).toLocaleTimeString('ar-SA', { hour: 'numeric', hour12: true });
                const temp = Math.round(hourly.temperature_2m[i]);
                const weatherInfo = getWeatherDescription(hourly.weather_code[i], hourly.is_day[i]);

                const card = document.createElement('div');
                card.className = 'glass-card flex flex-col items-center justify-between p-3 rounded-2xl min-w-[75px] shrink-0 text-center';
                card.innerHTML = `
                    <span class="text-[11px] text-amber-200/60">${timeStr}</span>
                    <i class="${weatherInfo.icon} text-xl text-amber-400 my-2"></i>
                    <span class="text-sm font-bold text-white">${temp}°</span>
                `;
                container.appendChild(card);
            }
        }

        // إنشاء قائمة توقعات الأيام القادمة
        function updateDailyForecast(daily) {
            const container = document.getElementById('dailyContainer');
            container.innerHTML = '';

            for (let i = 0; i < daily.time.length; i++) {
                const date = new Date(daily.time[i]);
                const dayName = i === 0 ? 'اليوم' : date.toLocaleDateString('ar-SA', { weekday: 'long' });
                const maxTemp = Math.round(daily.temperature_2m_max[i]);
                const minTemp = Math.round(daily.temperature_2m_min[i]);
                const weatherInfo = getWeatherDescription(daily.weather_code[i], 1);

                const row = document.createElement('div');
                row.className = 'flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all';
                row.innerHTML = `
                    <span class="text-sm font-semibold text-white w-24">${dayName}</span>
                    <div class="flex items-center gap-2">
                        <i class="${weatherInfo.icon} text-amber-400 text-base"></i>
                        <span class="text-xs text-amber-100/80">${weatherInfo.text}</span>
                    </div>
                    <div class="text-xs text-left w-20">
                        <span class="font-bold text-white">${maxTemp}°</span>
                        <span class="text-amber-200/50 mr-1">${minTemp}°</span>
                    </div>
                `;
                container.appendChild(row);
            }
        }

        // تحويل رمز حالة الطقس إلى وصف وأيقونة مناسبة
        function getWeatherDescription(code, isDay) {
            let text = "صافٍ";
            let icon = isDay ? "fa-solid fa-sun" : "fa-solid fa-moon";

            switch (code) {
                case 0:
                    text = isDay ? "مشمس صافٍ" : "ليل صافٍ";
                    icon = isDay ? "fa-solid fa-sun" : "fa-solid fa-moon";
                    break;
                case 1:
                case 2:
                    text = "غائم جزئياً";
                    icon = isDay ? "fa-solid fa-cloud-sun" : "fa-solid fa-cloud-moon";
                    break;
                case 3:
                    text = "غائم كلياً";
                    icon = isDay ? "fa-solid fa-cloud" : "fa-solid fa-cloud";
                    break;
                case 45:
                case 48:
                    text = "ضبابي";
                    icon = "fa-solid fa-smog";
                    break;
                case 51:
                case 53:
                case 55:
                case 56:
                case 57:
                    text = "رذاذ خفيف";
                    icon = "fa-solid fa-cloud-rain";
                    break;
                case 61:
                case 63:
                case 65:
                case 66:
                case 67:
                    text = "أمطار";
                    icon = "fa-solid fa-cloud-showers-heavy";
                    break;
                case 71:
                case 73:
                case 75:
                case 77:
                    text = "ثلوج";
                    icon = "fa-solid fa-snowflake";
                    break;
                case 95:
                case 96:
                case 99:
                    text = "عواصف رعدية";
                    icon = "fa-solid fa-cloud-bolt";
                    break;
            }
            return { text, icon };
        }

        // عرض رسالة تحميل أو تنبيه للمستخدم
        function showStatus(msg, isError) {
            const statusEl = document.getElementById('statusMessage');
            statusEl.textContent = msg;
            statusEl.classList.remove('hidden');
            if (isError) {
                statusEl.classList.add('text-red-400');
            } else {
                statusEl.classList.remove('text-red-400');
            }
        }

        // إخفاء رسالة الحالة
        function hideStatus() {
            const statusEl = document.getElementById('statusMessage');
            statusEl.classList.add('hidden');
        }