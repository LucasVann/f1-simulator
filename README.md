# 🏎️ F1 Simulator

¡Bienvenido a **F1 Simulator**! Una Single Page Application (SPA) de alto rendimiento construida con **React** que ofrece una experiencia inmersiva para los fanáticos de la Fórmula 1. Este proyecto utiliza datos en tiempo real e históricos para visualizar el desarrollo de las carreras, telemetría y estadísticas.

🚀 **Prueba la Demo en vivo:** [https://f1-simulator-rho.vercel.app/](https://f1-simulator-rho.vercel.app/)

---

## 🌟 Características Principales

* **Leaderboard en Tiempo Real:** Seguimiento preciso de las posiciones de los pilotos durante la sesión.
* **Race Engine Personalizado:** Lógica avanzada para simular o replicar el comportamiento de los monoplazas en pista.
* **Visualización de Circuitos:** Renderizado dinámico de trazados mediante SVG personalizados (`TrackSVG`).
* **Historial de Vueltas:** Análisis detallado del ritmo de carrera y tiempos por sector.
* **Comentarios Automáticos:** Sistema de "Live Commentary" basado en eventos de pista.
* **Integración con OpenF1:** Consumo de datos técnicos a través de servicios dedicados.

## 🛠️ Stack Tecnológico

* **Frontend:** React.js (Hooks, Context API).
* **Estilos:** CSS3 (Diseño responsivo y moderno).
* **Despliegue:** Vercel.
* **Datos:** OpenF1 API / Datos estáticos de pilotos.

---

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura limpia para escalabilidad:

* `src/components`: Componentes reutilizables (Banners, Leaderboards, Track views).
* `src/pages`: Las diferentes vistas de la SPA (Simulator, Stats, Calendar, Replay).
* `src/hooks`: Lógica de negocio extraída (Motores de carrera, gestión de comentarios).
* `src/services`: Módulos para la comunicación con APIs externas.

---

## 🚀 Instalación y Uso Local

Si quieres ejecutar este proyecto en tu máquina local, sigue estos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/LucasVann/f1-simulator.git](https://github.com/LucasVann/f1-simulator.git)
    ```

2.  **Entra en la carpeta:**
    ```bash
    cd f1-simulator
    ```

3.  **Instala las dependencias:**
    ```bash
    npm install
    ```

4.  **Inicia el servidor de desarrollo:**
    ```bash
    npm start
    ```
    La aplicación estará disponible en `http://localhost:3000`.

---

## 🧪 Testing

Este proyecto está preparado para pruebas de componentes y lógica. Para ejecutar los tests:
```bash
npm test