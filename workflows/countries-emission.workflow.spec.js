import { countriesEmissionWorkflow, getCountriesData, noData } from './countries-emission.workflow';
import { cash } from './countries-emission.workflow'
import footprintApi from '../footprintApi';
import assert from 'assert';

// Mock request and response objects
let req, res;

/**
 * @type {Array<Country>}
 */
const countries =  [
    {
        score: '1C',
        shortName: 'Falkland Islands',
        countryCode: '65',
        countryName: 'Falkland Islands',
        isoa2: 'FK'
    },
    {
        score: '1D',
        shortName: 'Gibraltar',
        countryCode: '82',
        countryName: 'Gibraltar',
        isoa2: 'GI'
    },
    {
        score: '1C',
        shortName: 'Kiribati',
        countryCode: '83',
        countryName: 'Kiribati',
        isoa2: 'KI'
    },
];

/**
 * Simplified Country Data for Falkland Islands
 * @type {Array<CountryData>}
 */
const falklandIslandsCountryData = [
    {
        "year": 1961,
        "countryCode": 65,
        "countryName": "Falkland Islands",
        "carbon": 22.8426359858333,

    },
    {
        "year": 1962,
        "countryCode": 65,
        "countryName": "Falkland Islands",
        "carbon": 6.77675073094722,
    },
]
/**
 * Simplified Country Data for Gibraltar
 * @type {Array<CountryData>}
 */
const gibraltarCountryData = [
    {
        "year": 1961,
        "countryCode": 82,
        "countryName": "Gibraltar",
        "carbon": 0.681602553794869,
    },
    {
        "year": 1962,
        "countryCode": 82,
        "countryName": "Gibraltar",
        "carbon": 0.694619424088622,
    },
]/**
 * Simplified Country Data for Kiribati
 * @type {Array<CountryData>}
 */
const kiribatiCountryData = [
        {
            "year": 1961,
            "countryCode": 83,
            "countryName": "Kiribati",
            "carbon": 0.0858498666712685,
        },
        {
            "year": 1962,
            "countryCode": 83,
            "countryName": "Kiribati",
            "carbon": 0.105824795451294,
        },
]

const countiesEmissionPerYears = {
    "1961": {
        'Falkland Islands': 22.8426359858333,
        'Gibraltar':  0.681602553794869,
        'Kiribati': 0.0858498666712685,
    },
    "1962": {
        'Falkland Islands': 6.77675073094722,
        'Gibraltar': 0.694619424088622,
        'Kiribati': 0.105824795451294,
    },
};

describe('countriesEmissionWorkflow Tests', () => {
    beforeEach(() => {
        req = {}; // empty request object

        res = {
            setHeader: () => {},
            send: () => {},
            status: () => ({ send: () => {} }),
        };

        // Reset any cache before each test
        cash.countriesEmission = null;

        // Mock the necessary environment variables
        process.env.REQ_DELAY = '1000';
        process.env.MAX_REQ_DELAY = '5000';
    });

    it('should return cached data if available', async () => {
        // Add some data to the cache
        cash.countriesEmission = { "Falkland Islands": { "1961": 22.8426359858333 } };

        // Spy on the `send` method
        let sentData;
        res.send = (data) => { sentData = data };

        await countriesEmissionWorkflow(req, res);
        assert.deepStrictEqual(sentData, cash.countriesEmission);
    });

    it('should fetch data and store it in cache if not available', async () => {
        // Mock footprintApi to return some countries
        footprintApi.getCountries = async () => countries;

        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') return falklandIslandsCountryData;
            if (countryCode === '82') return gibraltarCountryData;
            if (countryCode === '83') return kiribatiCountryData;
        };

        // Spy on the `send` method
        let sentData;
        res.send = (data) => { sentData = data };

        await countriesEmissionWorkflow(req, res);

        // The response should contain the fetched data
        assert.deepStrictEqual(sentData, countiesEmissionPerYears);
        // Also, ensure the cache is updated
        assert.deepStrictEqual(cash.countriesEmission, countiesEmissionPerYears);
    });

    it('should handle error and send a 500 response', async () => {
        // Mock footprintApi to throw an error
        footprintApi.getCountries = async () => {
            throw new Error('Failed to fetch countries');
        };

        // Spy on the `status` and `send` methods
        let statusCode;
        let sentData;
        res.status = (code) => {
            statusCode = code;
            return {
                send: (data) => { sentData = data },
            };
        };

        await countriesEmissionWorkflow(req, res);

        assert.strictEqual(statusCode, 500);
        assert.deepStrictEqual(sentData, {
            error: 'Failed to process countries emission data.',
        });

        //ensure the cache is cleared after the error
        assert.strictEqual(cash.countriesEmission, null);
    });
});

describe('getCountriesData Tests', () => {
    beforeEach(() => {
        // Mocking environment variables
        process.env.REQ_DELAY = '1000';
        process.env.MAX_REQ_DELAY = '3000';
    });

    it('should yield country data for each country', async () => {
        // Mock API responses for each country
        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') return falklandIslandsCountryData;
            if (countryCode === '82') return gibraltarCountryData;
            if (countryCode === '83') return kiribatiCountryData;
        };

        // Test the generator function
        const countryDataGenerator = getCountriesData(countries);
        let result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, falklandIslandsCountryData);

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, gibraltarCountryData);

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, kiribatiCountryData);

        result = await countryDataGenerator.next();
        assert.strictEqual(result.done, true); // No more data
    });

    it('should handle countries with no data', async () => {
        // Mock API to return an empty array for a country
        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') return [];
            if (countryCode === '82') return gibraltarCountryData;
            if (countryCode === '83') return kiribatiCountryData;
        };

        const countryDataGenerator = getCountriesData(countries);

        let result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, [{ countryName: 'Falkland Islands', countryCode: '65', carbon: -1, year: noData }]);

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, gibraltarCountryData);

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, kiribatiCountryData);
    });

    it('should increase delay on 429 error and retry', async () => {
        // Mock API to throw a 429 error initially
        let callCount = 0;
        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') {
                if (callCount === 0 || callCount === 1 || callCount === 2) {
                    callCount++;
                    const error = new Error('Too Many Requests');
                    error.response = {status: 429};
                    throw error;
                }
                return falklandIslandsCountryData;
            }
            if (countryCode === '82') return gibraltarCountryData;
            if (countryCode === '83') return kiribatiCountryData;
        };

        // Spy on delay function
        let delayCalledWith = [];
        const delay = async (ms) => { delayCalledWith.push(ms); };

        const countryDataGenerator = getCountriesData(countries, delay);

        let result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, falklandIslandsCountryData); // Should retry after delay
        assert.strictEqual(delayCalledWith[0], 1000); // First delay = default delay
        assert.strictEqual(delayCalledWith[1], 1500); // Second delay = default delay * 1,5
        assert.strictEqual(delayCalledWith[2], 2250); // Third delay = Second delay * 1,5

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, gibraltarCountryData);

        result = await countryDataGenerator.next();
        assert.deepStrictEqual(result.value, kiribatiCountryData);
    });

    it('should throw error if max delay was reached', async () => {
        // Rewriting environment variables
        process.env.REQ_DELAY = '1000';
        process.env.MAX_REQ_DELAY = '2000';
        // Mock API to throw a 429 error initially
        let callCount = 0;
        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') {
                if (callCount === 0 || callCount === 1 || callCount === 2) {
                    callCount++;
                    const error = new Error('Too Many Requests');
                    error.response = {status: 429};
                    throw error;
                }
                return falklandIslandsCountryData;
            }
        };

        // Spy on delay function
        const delay = async (ms) => {};

        try {
            const countryDataGenerator = getCountriesData(countries, delay);
            await countryDataGenerator.next();
        } catch (e) {
            assert.strictEqual('Max request delay was reached', e.message)
        }
    });

    it('should throw error if api error not 429', async () => {
        // Mock API to throw a 501 error initially
        footprintApi.getDataForCountry = async (countryCode) => {
            if (countryCode === '65') {
                    const error = new Error('internal server error');
                    error.response = {status: 501};
                    throw error;
            }
        };

        // Spy on delay function
        const delay = async (ms) => {};

        try {
            const countryDataGenerator = getCountriesData(countries, delay);
            await countryDataGenerator.next();
        } catch (e) {
            assert.strictEqual('Can\'t get countries data', e.message)
        }
    });
});

