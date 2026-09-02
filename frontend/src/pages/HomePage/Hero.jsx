// import React from "react";
import { apiUrl } from "../../api/config";
// import { Link } from "react-router-dom";

// /**
//  * Hero props:
//  * - model: main hero image src
//  * - logos: array of small logos to show at bottom (Logo1..Logo4)
//  */
// const Hero = ({ model, logos = [] }) => {
//   // examples: in HomePage.jsx
// async function handleLetsStart() {
//   try {
//     // try refresh first to get an access token if needed
//     await fetch(apiUrl("/auth/refresh"), { method: "POST", credentials: "include"});

//     // call /api/me with latest access token
//     const accessToken = localStorage.getItem("accessToken");
//     const res = await fetch(apiUrl("/api/me"), {
//       headers: { Authorization: `Bearer ${accessToken}` },
//       credentials: "include"
//     });
//     if (res.status === 401) {
//       // try refresh flow if access token expired
//       const refreshRes = await fetch(apiUrl("/auth/refresh"), { method: "POST", credentials: "include" });
//       const refreshBody = await refreshRes.json();
//       if (refreshRes.ok && refreshBody.accessToken) {
//         localStorage.setItem("accessToken", refreshBody.accessToken);
//         // retry /api/me
//         const retry = await fetch(apiUrl("/api/me"), {
//           headers: { Authorization: `Bearer ${refreshBody.accessToken}` },
//           credentials: "include"
//         });
//         if (retry.ok) {
//           const data = await retry.json();
//           if (data.profileCompleted) navigate("/dashboard"); else navigate("/profile-creation");
//           return;
//         }
//       }
//       // if still unauthorized, navigate to login
//       navigate("/login");
//       return;
//     }

//     if (!res.ok) {
//       navigate("/login");
//       return;
//     }
//     const data = await res.json();
//     if (data.profileCompleted) navigate("/dashboard");
//     else navigate("/profile-creation");
//   } catch (err) {
//     console.error(err);
//     navigate("/login");
//   }
// }

//   return (
//     <section className="flex flex-col-reverse md:flex-row items-start justify-between pt-8 pb-8 w-full">
//       {/* Text column */}
//       <div className="md:w-1/2 w-full text-left px-6 md:px-12 pt-6">
//         <h2 className="text-3xl md:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 max-w-2xl">
//           Financial consulting that{" "}
//           <span className="relative inline-block">
//             <span className="relative z-10 px-1 py-0.5 rounded">leads</span>
//             <span
//               aria-hidden
//               className="absolute left-0 bottom-1 w-full h-6 md:h-8 py-2 rounded-sm -z-10"
//               style={{
//                 backgroundColor: "#03ff39ff",
//                 transform: "skewX(-4deg)",
//               }}
//             />
//           </span>{" "}
//           you to your goals
//         </h2>

//         <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed max-w-xl">
//           Unlock data-driven insights tailored for wealth management advisors,
//           executives, and forward-thinking investors. Our platform empowers you
//           to make smarter decisions with clarity and confidence.
//         </p>

//         <div className="mt-8">
//           <Link
//           onClick={}
//             to="/profileCreation"
//             role="button"
//             className="inline-block bg-black text-white font-medium text-sm md:text-base px-8 py-3 rounded-full hover:bg-lime-400 hover:text-black transition duration-300 shadow-md"
//           >
//             Reinforce your team
//           </Link>
//         </div>

//         {/* bottom divider + logos row */}
//         <div className="mt-10 border-t border-gray-200 pt-6">
//           <div className="flex items-center justify-between gap-4">
//             <p className="text-sm text-gray-600">
//               We provide our service to many worldwide leading companies.
//             </p>

//             <div className="flex items-center gap-3">
//               <button
//                 aria-label="Previous"
//                 className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full bg-black"
//               >
//                 <span className="text-white">&lt;</span>
//               </button>
//               <button
//                 aria-label="Next"
//                 className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full bg-black"
//               >
//                 <span className="text-white">&gt;</span>
//               </button>
//             </div>
//           </div>

//           <div className="mt-4 flex flex-wrap items-center gap-6">
//             {logos.map((l, i) => (
//               <img
//                 key={i}
//                 src={l ?? "/placeholder.svg"}
//                 alt={`Partner ${i + 1}`}
//                 className="h-6 object-contain"
//               />
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Image column */}
//       <div className="md:w-1/2 w-full mb-6 md:mb-0 flex justify-end px-6 md:px-12 relative">
//         <img
//           src={model ?? "/placeholder.svg"}
//           alt="Financial planning illustration"
//           className="w-[650px] md:w-[700px] max-w-full h-auto rounded-2xl shadow"
//         />
//       </div>
//     </section>
//   );
// };

// export default Hero;

import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

/**
 * Hero props:
 * - model: main hero image src
 * - logos: array of small logos to show at bottom
 */
const Hero = ({ model, logos = [] }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const handleLetsStart = useCallback(async () => {
    setLoading(true);
    try {
      // Try refresh (cookie-based)
      await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });

      // Use saved access token if present
      let accessToken = localStorage.getItem("accessToken") || "";
      let meRes = await fetch(apiUrl("/api/me"), {
        method: "GET",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      // If unauthorized, try refresh again and retry
      if (meRes.status === 401) {
        const refreshRes = await fetch(apiUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json();
          if (refreshBody.accessToken) {
            localStorage.setItem("accessToken", refreshBody.accessToken);
            accessToken = refreshBody.accessToken;
            meRes = await fetch(apiUrl("/api/me"), {
              method: "GET",
              credentials: "include",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          }
        }
      }

      if (meRes.status === 401 || meRes.status === 403) {
        navigate("/login");
        return;
      }
      if (!meRes.ok) {
        navigate("/login");
        return;
      }
      const data = await meRes.json();

      // Update auth context so UI reflects latest session
      setUser({
        name: data.account?.full_name || "User",
        email: data.account?.email || "",
        avatar: data.account?.avatar || null,
        isLoggedIn: true,
        profileCompleted: !!data.profileCompleted,
        userId: data.account?.user_id || null,
      });

      if (data.profileCompleted) navigate("/dashboard");
      else navigate("/profile-creation");
    } catch (err) {
      console.error("Error in handleLetsStart:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate, setUser]);

  return (
    <section className="flex flex-col-reverse md:flex-row items-start justify-between pt-8 pb-8 w-full">
      {/* Text column */}
      <div className="md:w-1/2 w-full text-left px-6 md:px-12 pt-6">
        <h2 className="text-3xl md:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 max-w-2xl">
          Financial consulting that{" "}
          <span className="relative inline-block">
            <span className="relative z-10 px-1 py-0.5 rounded">leads</span>
            <span
              aria-hidden
              className="absolute left-0 bottom-1 w-full h-6 md:h-8 py-2 rounded-sm -z-10"
              style={{
                backgroundColor: "#03ff39ff",
                transform: "skewX(-4deg)",
              }}
            />
          </span>{" "}
          you to your goals
        </h2>

        <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed max-w-xl">
          Unlock data-driven insights tailored for wealth management advisors,
          executives, and forward-thinking investors. Our platform empowers you
          to make smarter decisions with clarity and confidence.
        </p>

        <div className="mt-8">
          <button
            onClick={() => {
              if (!loading) handleLetsStart();
            }}
            className={`inline-block bg-black text-white font-medium text-sm md:text-base px-8 py-3 rounded-full hover:bg-indigo-800 hover:text-white transition duration-300 shadow-md ${
              loading ? "opacity-70 pointer-events-none" : ""
            }`}
            aria-disabled={loading}
          >
            {loading ? "Please wait..." : "Let's Plan your dream"}
          </button>
        </div>

        {/* bottom divider + logos row */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              We provide our service to many worldwide leading companies.
            </p>

            <div className="flex items-center gap-3">
              <button
                aria-label="Previous"
                className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full bg-black"
              >
                <span className="text-white">&lt;</span>
              </button>
              <button
                aria-label="Next"
                className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-full bg-black"
              >
                <span className="text-white">&gt;</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            {logos.map((l, i) => (
              <img
                key={i}
                src={l ?? "/placeholder.svg"}
                alt={`Partner ${i + 1}`}
                className="h-6 object-contain"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Image column */}
      <div className="md:w-1/2 w-full mb-6 md:mb-0 flex justify-end px-6 md:px-12 relative">
        <img
          src={model ?? "/placeholder.svg"}
          alt="Financial planning illustration"
          className="w-[650px] md:w-[700px] max-w-full h-auto rounded-2xl"
        />
      </div>
    </section>
  );
};

export default Hero;
