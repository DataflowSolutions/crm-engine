import React from "react";
import { useTranslations } from "next-intl";

const TosPage = () => {
  const t = useTranslations("TermsOfService");

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-700">
        {t("title")}
      </h1>
      <p className="mb-4 text-gray-700">
        {t("intro")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section1.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section1.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section2.title")}
      </h2>
      <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
        <li>{t("section2.item1")}</li>
        <li>{t("section2.item2")}</li>
        <li>{t("section2.item3")}</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section3.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section3.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section4.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section4.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section5.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section5.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section6.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section6.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section7.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section7.content")}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2 text-blue-600">
        {t("section8.title")}
      </h2>
      <p className="mb-4 text-gray-700">
        {t("section8.content")}{" "}
        <a
          href={`mailto:${t("section8.email")}`}
          className="text-blue-500 underline"
        >
          {t("section8.email")}
        </a>
        .
      </p>

      <p className="text-sm text-gray-500 mt-10 text-center">
        &copy; {new Date().getFullYear()} {t("footer")}
      </p>
    </div>
  );
};

export default TosPage;
