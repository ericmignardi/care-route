package com.careroute.backend.support;

import com.careroute.backend.model.Availability;
import com.careroute.backend.model.CarePlanTask;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;
import com.careroute.backend.model.Role;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.User;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.model.VisitTask;
import com.careroute.backend.repository.AvailabilityRepository;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.repository.ClientRepository;
import com.careroute.backend.repository.RoleRepository;
import com.careroute.backend.repository.UserRepository;
import com.careroute.backend.repository.VisitRepository;
import com.careroute.backend.security.CustomUserDetails;
import com.careroute.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;

/**
 * The shared Testcontainers Postgres every integration test runs against.
 *
 * <p>A JVM-wide singleton in a static initialiser rather than a per-class {@code @Container}:
 * every subclass declares the same context configuration, so Spring caches one context and
 * Docker starts one database for the whole suite. Real Postgres rather than a substitute,
 * because the schema is Flyway-managed and Hibernate validates the mappings against it.
 *
 * <p>Every test starts from an empty domain. {@code roles} is spared: it is reference data
 * owned by {@code V3__seed_roles.sql}, not fixture.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import(TestClockConfig.class)
public abstract class AbstractIntegrationTest {

    /** A Tuesday. Fixtures derive their availability from it, so the day itself never matters. */
    protected static final LocalDate DAY = LocalDate.of(2026, 9, 1);

    private static final String TRUNCATE_DOMAIN = """
            TRUNCATE TABLE visit_tasks, visits, availability, caregiver_skills, caregivers,
                           care_plan_tasks, clients, user_roles, users
            RESTART IDENTITY CASCADE
            """;

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired protected UserRepository userRepository;
    @Autowired protected RoleRepository roleRepository;
    @Autowired protected ClientRepository clientRepository;
    @Autowired protected CaregiverRepository caregiverRepository;
    @Autowired protected AvailabilityRepository availabilityRepository;
    @Autowired protected VisitRepository visitRepository;
    @Autowired protected MutableClock clock;
    @Autowired protected MockMvc mockMvc;
    @Autowired protected JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetDomainAndClock() {
        jdbcTemplate.execute(TRUNCATE_DOMAIN);
        clock.setNow(DAY.atTime(9, 0));
    }

    // --- time helpers -------------------------------------------------------

    protected static LocalDateTime at(int hour, int minute) {
        return DAY.atTime(hour, minute);
    }

    protected static LocalDateTime at(LocalDate date, int hour, int minute) {
        return date.atTime(hour, minute);
    }

    // --- fixtures -----------------------------------------------------------

    protected User persistUser(String username, String roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException(roleName + " is missing; did V3__seed_roles.sql run?"));
        User user = new User();
        user.setUsername(username);
        user.setPassword("irrelevant");
        user.setFirstName(username);
        user.setLastName("Test");
        user.setRoles(Set.of(role));
        return userRepository.save(user);
    }

    /** A caregiver available 08:00 to 16:00 on the fixture day, holding the given skills. */
    protected Caregiver persistCaregiver(String username, Skill... skills) {
        return persistCaregiver(username, LocalTime.of(8, 0), LocalTime.of(16, 0), skills);
    }

    protected Caregiver persistCaregiver(String username, LocalTime availableFrom, LocalTime availableTo,
                                         Skill... skills) {
        Caregiver caregiver = newCaregiver(username, CaregiverStatus.ACTIVE, skills);
        caregiver.addAvailability(Availability.builder()
                .dayOfWeek(DAY.getDayOfWeek())
                .startTime(availableFrom)
                .endTime(availableTo)
                .build());
        return caregiverRepository.save(caregiver);
    }

    /** A caregiver with no availability at all, for the BR-2 "does not work that day" case. */
    protected Caregiver persistCaregiverWithoutAvailability(String username, Skill... skills) {
        return caregiverRepository.save(newCaregiver(username, CaregiverStatus.ACTIVE, skills));
    }

    protected Caregiver persistInactiveCaregiver(String username, Skill... skills) {
        Caregiver caregiver = newCaregiver(username, CaregiverStatus.INACTIVE, skills);
        caregiver.addAvailability(Availability.builder()
                .dayOfWeek(DAY.getDayOfWeek())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(16, 0))
                .build());
        return caregiverRepository.save(caregiver);
    }

    protected void addAvailability(Caregiver caregiver, DayOfWeek dayOfWeek, LocalTime start, LocalTime end) {
        availabilityRepository.save(Availability.builder()
                .caregiver(caregiver)
                .dayOfWeek(dayOfWeek)
                .startTime(start)
                .endTime(end)
                .build());
    }

    protected Client persistClient(String lastName, String... carePlanTasks) {
        Client client = Client.builder()
                .firstName("Test")
                .lastName(lastName)
                .addressLine("1 Wilson Street")
                .city("Ancaster")
                .postalCode("L9G1A1")
                .status(ClientStatus.ACTIVE)
                .build();
        int sortOrder = 0;
        for (String description : carePlanTasks) {
            client.addCarePlanTask(CarePlanTask.builder()
                    .description(description)
                    .sortOrder(sortOrder++)
                    .build());
        }
        return clientRepository.save(client);
    }

    protected Visit persistVisit(Client client, Caregiver caregiver, LocalDateTime start, LocalDateTime end,
                                 Skill requiredSkill, VisitStatus status) {
        return persistVisitWithTasks(client, caregiver, start, end, requiredSkill, status);
    }

    protected Visit persistVisitWithTasks(Client client, Caregiver caregiver, LocalDateTime start, LocalDateTime end,
                                          Skill requiredSkill, VisitStatus status, String... tasks) {
        Visit visit = Visit.builder()
                .client(client)
                .caregiver(caregiver)
                .scheduledStart(start)
                .scheduledEnd(end)
                .requiredSkill(requiredSkill)
                .status(status)
                .build();
        int sortOrder = 0;
        for (String description : tasks) {
            visit.addTask(VisitTask.builder()
                    .description(description)
                    .sortOrder(sortOrder++)
                    .completed(false)
                    .build());
        }
        return visitRepository.save(visit);
    }

    /** A bearer token for the account, minted exactly the way {@code /auth/login} mints one. */
    protected String tokenFor(User user) {
        return jwtService.generateToken(principalFor(user));
    }

    protected String tokenFor(Caregiver caregiver) {
        return tokenFor(caregiver.getUser());
    }

    protected CustomUserDetails principalFor(User user) {
        return CustomUserDetails.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .password(user.getPassword())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles())
                .build();
    }

    protected CustomUserDetails principalFor(Caregiver caregiver) {
        return principalFor(caregiver.getUser());
    }

    private Caregiver newCaregiver(String username, CaregiverStatus status, Skill... skills) {
        User user = persistUser(username, "ROLE_CAREGIVER");
        Set<Skill> skillSet = skills.length == 0 ? EnumSet.noneOf(Skill.class) : EnumSet.copyOf(Set.of(skills));
        return Caregiver.builder()
                .user(user)
                .phone("905-555-0100")
                .status(status)
                .skills(skillSet)
                .build();
    }
}
