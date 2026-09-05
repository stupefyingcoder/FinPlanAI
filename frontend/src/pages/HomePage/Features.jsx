import React from "react";

/**
 * Features props:
 * - features: object with Feature1..Feature6 images (keys: f1..f6)
 */
const Features = ({ features = {} }) => {
  const { f1, f2, f3, f4, f5, f6 } = features;

  return (
 <section
         className="py-12"
         style={{
           fontFamily:
             "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
         }}
       >
         <link
           href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
           rel="stylesheet"
         />
 
         <div className="max-w-10xl mx-auto px-6 lg:px-12">
           <div
             className="bg-white rounded-[28px] p-6 md:p-10 shadow-[0_12px_40px_rgba(59,130,246,0.32)]"
             style={{ backgroundClip: "padding-box" }}
           >
             <div className="mb-8 flex flex-col items-center text-center">
               <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
                 Powerful tools to plan, grow & protect your finances
               </h2>
               <p className="mt-3 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                 All your financial planning in one beautiful dashboard —
                 savings, strategy, goal-tracking and product comparison to take
                 confident action.
               </p>
             </div>
 
             <div
               className="grid gap-6"
               style={{
                 gridTemplateColumns: "1.6fr 1fr 1fr",
                 gridTemplateRows: "auto auto auto",
                 gridTemplateAreas: `"A B B"
              "A C D"
              "E E F"`,
               }}
             >
               {/* A - tall left card: text left, illustration panel right (fills panel) */}
               <article
                 className="relative rounded-2xl p-6 border border-gray-200 shadow-sm"
                 style={{
                   gridArea: "A",
                   background:
                     "linear-gradient(180deg,#f5f3ff 0%, #f8f7ff 100%)",
                 }}
                 aria-labelledby="a-title"
               >
                 {/* Title Section */}
                 <div className="flex items-center gap-3 mb-2">
                   <h3
                     id="a-title"
                     className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight"
                   >
                     Maximize Savings & Returns
                   </h3>
                   <span
                     className="inline-block h-2 w-40 rounded-full"
                     style={{
                       background: "linear-gradient(90deg,#86efac,#34d399)",
                     }}
                     aria-hidden
                   />
                 </div>
 
                 {/* Content Section */}
                 <div className="flex items-center gap-6">
                   {/* Description */}
                   <div className="md:flex-1">
                     <p className="text-left text-slate-700 mb-3 leading-relaxed">
                       We match your goals to tax-aware savings and investment
                       options tailored to your timeframe so your portfolio moves
                       toward the target.
                     </p>
                     <p className="text-left text-sm text-slate-600">
                       Actionable suggestions and timely alerts prioritized for
                       you.
                     </p>
                   </div>
 
                   {/* Image Panel */}
                   <div className="w-50 flex-shrink-0 flex items-center justify-center">
                     <div className="h-auto flex items-center justify-center">
                       <img
                         src={
                           f1 ||
                           "/original-47da46b0bc890e0147f458c5c151b287.webp"
                         }
                         alt="Maximize savings illustration"
                         className="w-[250px] h-auto object-contain"
                       />
                     </div>
                   </div>
                 </div>
               </article>
 
               {/* B - top-right wide card: text left, small image tile at right */}
               <article
                 className="relative rounded-2xl p-2  border border-gray-200 shadow-sm flex items-center px-[20px]"
                 style={{
                   gridArea: "B",
                   minHeight: "140px",
                   background: "linear-gradient(90deg,#fff0f5,#fff6fb)",
                 }}
                 aria-labelledby="b-title"
               >
                 <div className="flex-1 pr-4">
                   <div className="flex items-center gap-3">
                     <h4
                       id="b-title"
                       className="text-2xl md:text-3xl font-bold text-slate-900"
                     >
                       One financial profile
                     </h4>
                     <span
                       className="h-1.5 w-8 rounded-full"
                       style={{
                         background: "linear-gradient(90deg,#86efac,#34d399)",
                       }}
                       aria-hidden
                     />
                   </div>
                   <p className="text-left text-slate-600 text-sm mt-2">
                     Capture income, savings, liabilities, goals and risk
                     appetite once — every recommendation is built from it.
                   </p>
                 </div>
 
                 {/* small right image tile — fixed to avoid empty gap */}
                 <div className="w-50 h-50 flex-shrink-0 flex items-center justify-center">
                   <img
                     src={
                       f2 ||
                       "/original-47da46b0bc890e0147f458c5c151b287.webp"
                     }
                     alt="Manage accounts"
                     className="w-[180px] h-[180px] object-contain"
                   />
                 </div>
               </article>
 
               {/* C - small tile: anchored icon top-right, compact text area */}
              <article
   className="relative rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between"
   style={{
     gridArea: "C",
     minHeight: "130px",
     background: "linear-gradient(180deg,#fffbeb,#fffbeb)",
   }}
   aria-labelledby="c-title"
 >
   {/* Title + Description + Icon in horizontal layout */}
   <div className="flex items-start justify-between">
     {/* Text Block */}
     <div className="max-w-[220px]">
       <div className="flex items-center gap-3">
         <h4
           id="c-title"
           className="text-xl md:text-2xl font-semibold text-slate-900"
         >
           Set Goals
         </h4>
         <span
           className="h-1.5 w-7 rounded-full bg-lime-400"
           aria-hidden
         />
       </div>
       <p className="text-left text-slate-600 text-sm mt-2 leading-relaxed">
         Define targets and track progress with simple steps and milestone reminders.
       </p>
     </div>
 
     {/* Icon */}
 <div className="w-[220px] h-[100px] flex items-center justify-center ml-4">
   <img
     src={
       f3 ||
       "/original-47da46b0bc890e0147f458c5c151b287.webp"
     }
     alt="Set goals icon"
     className="w-full h-full object-contain"
   />
 </div>
   </div>
 </article>
 
               {/* D - small tile: anchored icon top-right */}
             <article
   className="rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between"
   style={{
     gridArea: "D",
     minHeight: "130px",
     background: "linear-gradient(180deg,#ecfdf5,#ecfdf5)",
   }}
   aria-labelledby="d-title"
 >
   {/* Title + Content Row */}
   <div className="flex items-start justify-between">
     {/* Text Block */}
     <div className="max-w-[220px]">
       <div className="flex items-center gap-3">
         <h4
           id="d-title"
           className="text-xl md:text-2xl font-semibold text-slate-900"
         >
           Wealth Insights
         </h4>
         <span
           className="h-1.5 w-7 rounded-full bg-lime-400"
           aria-hidden
         />
       </div>
       <p className="text-left text-slate-600 text-sm mt-2 leading-relaxed">
         Quick diagnostics to spot allocation issues, risk exposure, and simple improvements.
       </p>
     </div>
 
     {/* Image Block */}
     <div className="w-[220px] h-[100px] flex items-center justify-center ml-4">
       <img
         src={
           f5 ||
           "/original-47da46b0bc890e0147f458c5c151b287.webp"
         }
         alt="Wealth insights icon"
         className="w-full h-full object-contain"
       />
     </div>
   </div>
 </article>
 
               {/* E - bottom-left big card: illustration on left, text on right (fills available width) */}
               <article
                 className="rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center"
                 style={{
                   gridArea: "E",
                   minHeight: "220px",
                   background: "linear-gradient(180deg,#fde2d3,#fff7f8)",
                 }}
                 aria-labelledby="e-title"
               >
                 {/* illustration left — larger and fills its container to avoid blank columns */}
                 <div className="h-[200px] w-[300px]flex-shrink-0 mr-6">
                   <div className="flex items-center justify-center">
                     <img
                       src={
                         f4 ||
                         "/original-47da46b0bc890e0147f458c5c151b287.webp"
                       }
                       alt="Personalized strategy"
                       className="w-full h-full object-contain"
                     />
                   </div>
                 </div>
 
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-3">
                     <h3
                       id="e-title"
                       className="text-3xl md:text-3xl lg:text-4xl font-extrabold text-slate-900"
                     >
                       Personalized Financial Strategy
                     </h3>
                     <span
                       className="inline-block h-2 w-10 rounded-full"
                       style={{
                         background: "linear-gradient(90deg,#86efac,#34d399)",
                       }}
                       aria-hidden
                     />
                   </div>
                   <p className="text-slate-700 mb-3 leading-relaxed">
                     A clear, month-by-month plan tuned to your income and life
                     stage — prioritized actions you can take now.
                   </p>
                   <div className="flex gap-2">
                     <span className="px-3 py-1 text-xs font-medium rounded-full text-white bg-black/90 border">
                       Budgeting
                     </span>
                     <span className="px-3 py-1 text-xs font-medium rounded-full text-white bg-black/90 border">
                       Investments
                     </span>
                   </div>
                 </div>
               </article>
 
               {/* F - bottom-right medium card: text left, image tile right (fills tile) */}
               <article
                 className="rounded-2xl p-6 border border-gray-200 shadow-sm"
                 style={{
                   gridArea: "F",
                   minHeight: "220px",
                   background: "linear-gradient(180deg,#f0f9ff,#f8fbff)",
                 }}
                 aria-labelledby="f-title"
               >
                 {/* First Level: Title */}
                 <div className="mb-3 w-80">
                   <div className="flex items-center gap-3">
                     <h4
                       id="f-title"
                       className="text-xl md:text-2xl font-bold text-slate-900"
                     >
                       Compare & Apply
                     </h4>
                     <span
                       className="h-1.5 w-8 rounded-full"
                       style={{
                         background: "linear-gradient(90deg,#86efac,#34d399)",
                       }}
                       aria-hidden
                     />
                   </div>
                 </div>
 
                 {/* Second Level: Description + Image */}
                 <div className="flex items-center gap-6">
                   {/* Description */}
                   <div className="flex-1">
                     <p className="text-left text-slate-600 text-sm leading-relaxed">
                       View financial products side by side to compare fees, returns, rewards, and risk. Apply directly through your dashboard with simplified flows and clear insights for confident decision-making
                     </p>
                   </div>
 
                   {/* Image */}
                   <div className="w-36 h-28 flex-shrink-0">
                     <div className="h-full w-full bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm border">
                       <img
                         src={
                           f6 ||
                           "/original-47da46b0bc890e0147f458c5c151b287.webp"
                         }
                         alt="Compare and choose plans"
                         className="w-full h-full object-contain"
                       />
                     </div>
                   </div>
                 </div>
               </article>
             </div>
           </div>
         </div>
       </section>
  );
};

export default Features;
