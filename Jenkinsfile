node {
  stage('SCM') {
    checkout poll: false, scm: [$class: 'GitSCM', branches: [[name: 'feature/EBSIINT-264']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: 'https://n002tbs0@ec.europa.eu/cefdigital/code/scm/ebsi/5-besu-trusted-app-register.git', credentialsId: 'EBSI_Jara']]]
  }
  stage('SonarQube Analysis') {
        sh "/var/lib/jenkins/tools/hudson.plugins.sonar.SonarRunnerInstallation/sonar-scanner/bin/sonar-scanner -Dsonar.host.url=https://infra.ebsi.xyz/sonar -Dsonar.projectName=5-besu-trusted-app-register -Dsonar.projectVersion=1.0 -Dsonar.projectKey=5-besu-trusted-app-register -Dsonar.sources=. -Dsonar.projectBaseDir=/var/lib/jenkins/workspace/5-besu-trusted-app-register"
    }
  }