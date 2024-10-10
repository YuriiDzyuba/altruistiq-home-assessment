import footprintApi from "../footprintApi";
import { delay } from "../utils/delay";

export const noData = 'nodata';

export const cash = {
    countriesEmission: null
};

/**
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @return {Promise<void>}
 */
export async function countriesEmissionWorkflow(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (cash.countriesEmission && Object.keys(cash.countriesEmission).length > 0) {
        res.send(cash.countriesEmission);
        return;
    } else {
        cash.countriesEmission = null;
    }

    try {
        const countries = await footprintApi.getCountries();
        const countriesData = getCountriesData(countries, delay);

        for await (const countryData of countriesData) {
            const countryEmissionsByYear = calculateCountryEmissionPerYear(countryData);

            if (!cash.countriesEmission) cash.countriesEmission = countryEmissionsByYear;
            else cash.countriesEmission = mergeEmission(cash.countriesEmission, countryEmissionsByYear);
        }
        res.send(cash.countriesEmission);
    } catch (e) {
        console.error('Error during executing workflow:', e.message);
        cash.countriesEmission = null;
        res.status(500).send({ error: 'Failed to process countries emission data.' });
    }
}

/**
 * Merges two objects representing country emissions data by year.
 * @param {CountryEmissionsByYear} cashedData
 * @param {CountryEmissionsByYear} newData
 * @return {CountryEmissionsByYear}
 */
const mergeEmission = (cashedData, newData) => {
    const mergedYears = new Set(Object.keys(cashedData).concat(Object.keys(newData)));
    const result = {};

    for (const year of mergedYears) {
        result[year] = {...cashedData[year], ...newData[year]};
    }
    return result;
};

/**
 * Asynchronously fetches data for a list of countries, yielding country data
 * and handling delays between requests if necessary.
 * @param {Array<Country>}countries
 * @param {Delay} delay
 * @return {AsyncGenerator<Array<CountryData>, void, *>}
 */
export async function* getCountriesData(countries, delay) {
    const defaultDelay = Number(process.env.REQ_DELAY);
    const maxDelay = Number(process.env.MAX_REQ_DELAY);
    let currentDelay = defaultDelay;
    let currentIndex = 0;

    while (countries.length > currentIndex) {
        const countryCode= countries[currentIndex].countryCode;
        const countryName= countries[currentIndex].countryName;
        try {
            let countryData = await footprintApi.getDataForCountry(countryCode);
            if (!countryData.length) {
                console.warn(`No data for country: ${countryName}; country-code: ${countryCode}`);
                // set invalid values for year and carbon
                countryData = [{ countryName, countryCode, carbon: -1, year: noData }];
            }
            yield countryData;
            currentIndex = currentIndex+1;
            currentDelay = defaultDelay;
        } catch (error) {
            console.error(`Error fetching data for country: ${countryName}; country-code: ${countryCode}`, error.message);
            if (error?.response?.status === 429) {
                console.warn(`Adding delay: ${currentDelay/1000}sec before next request`);
                if (currentDelay >= maxDelay) throw new Error('Max request delay was reached');
                await delay(currentDelay);
                currentDelay = Math.min(currentDelay * 1.5, maxDelay);
            } else {
                throw new Error('Can\'t get countries data');
            }
        }
    }
}

/**
 * Key - year, value - Emission by year
 * @typedef {Object<string, number>} EmissionByYear
 */

/**
 * @typedef {Object} CountryEmissionsByYear
 * @property {Object<string,Object<EmissionByYear>>}
 */

/**
 * Calculate total emission per country per year
 * @param {Array<CountryData>}countryData
 * @return {CountryEmissionsByYear}
 */
export function calculateCountryEmissionPerYear(countryData) {
    return countryData.reduce((acc, current) => {
        const countryName = countryData[0].countryName;
        if (!acc[current.year]) acc[current.year] = {};
        if (!acc[current.year][countryName]) acc[current.year][countryName] = current.carbon;
        return acc;
    }, {});
}

